import { prisma } from '@ecommerce-hr/db';
import { extractPricesFromHtml, computePriceDiff } from '@ecommerce-hr/ai';
import type { ProductPrice, PriceDiff } from '@ecommerce-hr/ai';
import { emitEvent } from '../lib/event-bus.js';
import { DomainEvents } from '@ecommerce-hr/shared';
import { logger } from '../utils/logger.js';

export async function scanPrices(competitorId: string, categoryUrl: string, html: string) {
  const competitor = await prisma.competitor.findUnique({ where: { id: competitorId } });
  if (!competitor) throw new Error('Competitor not found');
  if (!competitor.categoryUrls.includes(categoryUrl)) {
    throw new Error('Category URL not found for this competitor');
  }

  try {
    logger.info({ competitorId, htmlLength: html.length, categoryUrl }, 'Price scan starting');
    const products = await extractPricesFromHtml(html, categoryUrl, competitor.name);
    logger.info({ competitorId, productCount: products.length, firstProduct: products[0]?.name ?? 'none' }, 'Price extraction complete');

    if (products.length === 0) {
      throw new Error('Nije pronađen nijedan proizvod u HTML-u. Provjerite da ste zalijepili izvorni kod stranice s proizvodima.');
    }

    // Get previous snapshot for this specific category
    const previousSnapshot = await prisma.priceSnapshot.findFirst({
      where: { competitorId, categoryUrl },
      orderBy: { scannedAt: 'desc' },
    });

    let diff: PriceDiff | null = null;
    if (previousSnapshot) {
      const previousProducts = previousSnapshot.products as unknown as ProductPrice[];
      diff = computePriceDiff(products, previousProducts);
    }

    const snapshot = await prisma.priceSnapshot.create({
      data: {
        competitorId,
        categoryUrl,
        products: JSON.parse(JSON.stringify(products)),
        diff: diff ? JSON.parse(JSON.stringify(diff)) : null,
      },
    });

    await emitEvent(DomainEvents.COMPETITOR_PRICE_SCAN_COMPLETED, {
      competitorId,
      snapshotId: snapshot.id,
      categoryUrl,
      productCount: products.length,
      priceChanges: diff?.priceChanges?.length ?? 0,
    });

    // Generate price alerts
    await generatePriceAlerts(competitor, snapshot, diff);

    return snapshot;
  } catch (error) {
    logger.error({ error, competitorId, categoryUrl }, 'Price scan failed');
    throw error;
  }
}

export async function getPriceSnapshots(competitorId: string, page: number, limit: number, categoryUrl?: string) {
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = { competitorId };
  if (categoryUrl) where.categoryUrl = categoryUrl;

  const [snapshots, total] = await Promise.all([
    prisma.priceSnapshot.findMany({
      where,
      skip,
      take: limit,
      orderBy: { scannedAt: 'desc' },
    }),
    prisma.priceSnapshot.count({ where }),
  ]);

  return { snapshots, total };
}

export async function getLatestPriceSnapshot(competitorId: string, categoryUrl?: string) {
  const where: Record<string, unknown> = { competitorId };
  if (categoryUrl) where.categoryUrl = categoryUrl;

  return prisma.priceSnapshot.findFirst({
    where,
    orderBy: { scannedAt: 'desc' },
  });
}

export async function getPriceAlertsSummary() {
  const competitors = await prisma.competitor.findMany({
    where: { isActive: true, categoryUrls: { isEmpty: false } },
    include: {
      priceSnapshots: {
        orderBy: { scannedAt: 'desc' },
        take: 1,
      },
    },
  });

  const alerts: Array<{
    competitorId: string;
    competitorName: string;
    priceDrops: number;
    priceIncreases: number;
    lastScanned: string | null;
  }> = [];

  for (const c of competitors) {
    const latest = c.priceSnapshots[0];
    if (!latest?.diff) continue;

    const diff = latest.diff as unknown as PriceDiff;
    const drops = diff.priceChanges?.filter((ch) => ch.changePercent < 0).length ?? 0;
    const increases = diff.priceChanges?.filter((ch) => ch.changePercent > 0).length ?? 0;

    if (drops > 0 || increases > 0) {
      alerts.push({
        competitorId: c.id,
        competitorName: c.name,
        priceDrops: drops,
        priceIncreases: increases,
        lastScanned: latest.scannedAt.toISOString(),
      });
    }
  }

  return alerts;
}

// Normalize name for fuzzy matching
function normalizeTokens(name: string): string[] {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length > 1);
}

function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  let inter = 0;
  for (const t of setA) { if (setB.has(t)) inter++; }
  const union = setA.size + setB.size - inter;
  return union === 0 ? 0 : inter / union;
}

async function generatePriceAlerts(
  competitor: { id: string; name: string },
  snapshot: { id: string },
  diff: PriceDiff | null,
) {
  if (!diff) return;

  // Find all members that have products (for UNDERCUT detection)
  const members = await prisma.member.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, userId: true, memberProducts: { where: { isActive: true } } },
  });

  const alertsToCreate: Array<{
    memberId?: string;
    competitorId: string;
    snapshotId: string;
    alertType: string;
    productName: string;
    competitorName: string;
    oldPrice?: number;
    newPrice?: number;
    changePercent?: number;
    memberPrice?: number;
  }> = [];

  const notificationsToCreate: Array<{
    userId: string;
    type: 'WARNING' | 'INFO';
    title: string;
    message: string;
    actionUrl: string;
  }> = [];

  // Price changes → PRICE_DROP / PRICE_INCREASE alerts
  for (const change of diff.priceChanges ?? []) {
    const alertType = change.changePercent < 0 ? 'PRICE_DROP' : 'PRICE_INCREASE';

    // Check if any member has a matching product (for UNDERCUT)
    for (const member of members) {
      for (const mp of member.memberProducts) {
        const mpTokens = normalizeTokens(mp.name);
        const cpTokens = normalizeTokens(change.name);
        if (jaccardSimilarity(mpTokens, cpTokens) > 0.5 || mp.name.toLowerCase().includes(change.name.toLowerCase()) || change.name.toLowerCase().includes(mp.name.toLowerCase())) {
          const memberPrice = Number(mp.price);
          if (change.newPrice < memberPrice) {
            alertsToCreate.push({
              memberId: member.id,
              competitorId: competitor.id,
              snapshotId: snapshot.id,
              alertType: 'UNDERCUT',
              productName: change.name,
              competitorName: competitor.name,
              oldPrice: change.oldPrice,
              newPrice: change.newPrice,
              changePercent: change.changePercent,
              memberPrice: memberPrice,
            });

            const pctCheaper = Math.round(((memberPrice - change.newPrice) / memberPrice) * 100);
            notificationsToCreate.push({
              userId: member.userId,
              type: 'WARNING',
              title: `${competitor.name} ima nižu cijenu!`,
              message: `${change.name}: ${change.newPrice} EUR (vi: ${memberPrice} EUR, ${pctCheaper}% skuplji)`,
              actionUrl: '/alerts',
            });
          } else {
            // Still create the price change alert for this member
            alertsToCreate.push({
              memberId: member.id,
              competitorId: competitor.id,
              snapshotId: snapshot.id,
              alertType,
              productName: change.name,
              competitorName: competitor.name,
              oldPrice: change.oldPrice,
              newPrice: change.newPrice,
              changePercent: change.changePercent,
              memberPrice: memberPrice,
            });
          }
        }
      }
    }

    // Also create a generic alert (no member)
    alertsToCreate.push({
      competitorId: competitor.id,
      snapshotId: snapshot.id,
      alertType,
      productName: change.name,
      competitorName: competitor.name,
      oldPrice: change.oldPrice,
      newPrice: change.newPrice,
      changePercent: change.changePercent,
    });
  }

  // New products → NEW_PRODUCT alerts
  for (const added of diff.added ?? []) {
    alertsToCreate.push({
      competitorId: competitor.id,
      snapshotId: snapshot.id,
      alertType: 'NEW_PRODUCT',
      productName: added.name,
      competitorName: competitor.name,
      newPrice: added.price,
    });
  }

  // Notify all active members about significant changes
  if (diff.priceChanges?.length > 0 || diff.added?.length > 0) {
    for (const member of members) {
      if (notificationsToCreate.some(n => n.userId === member.userId)) continue;

      const drops = diff.priceChanges?.filter(c => c.changePercent < 0).length ?? 0;
      const increases = diff.priceChanges?.filter(c => c.changePercent > 0).length ?? 0;
      const parts: string[] = [];
      if (drops > 0) parts.push(`${drops} sniženje`);
      if (increases > 0) parts.push(`${increases} poskupljenje`);
      if (diff.added?.length > 0) parts.push(`${diff.added.length} novi proizvod`);

      notificationsToCreate.push({
        userId: member.userId,
        type: 'INFO',
        title: `Promjene cijena: ${competitor.name}`,
        message: parts.join(', '),
        actionUrl: '/alerts',
      });
    }
  }

  // Batch create
  if (alertsToCreate.length > 0) {
    await prisma.priceAlert.createMany({ data: alertsToCreate as never[] });
  }
  if (notificationsToCreate.length > 0) {
    await prisma.notification.createMany({ data: notificationsToCreate });
  }
}

// Get price alerts for a member
export async function getMemberPriceAlerts(
  memberId: string | null,
  page: number,
  limit: number,
  filters?: { alertType?: string; competitorId?: string; isRead?: boolean },
) {
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = {};

  if (memberId) {
    where.OR = [{ memberId }, { memberId: null }];
  }
  if (filters?.alertType) where.alertType = filters.alertType;
  if (filters?.competitorId) where.competitorId = filters.competitorId;
  if (filters?.isRead !== undefined) where.isRead = filters.isRead;

  const [alerts, total] = await Promise.all([
    prisma.priceAlert.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { competitor: { select: { name: true, website: true } } },
    }),
    prisma.priceAlert.count({ where }),
  ]);

  return { alerts, total };
}

// Get alerts summary
export async function getPriceAlertsSummaryForMember(memberId: string | null) {
  const where: Record<string, unknown> = {};
  if (memberId) {
    where.OR = [{ memberId }, { memberId: null }];
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  where.createdAt = { gte: sevenDaysAgo };

  const alerts = await prisma.priceAlert.findMany({ where, select: { alertType: true } });

  return {
    totalChanges: alerts.length,
    drops: alerts.filter(a => a.alertType === 'PRICE_DROP').length,
    increases: alerts.filter(a => a.alertType === 'PRICE_INCREASE').length,
    undercuts: alerts.filter(a => a.alertType === 'UNDERCUT').length,
    newProducts: alerts.filter(a => a.alertType === 'NEW_PRODUCT').length,
  };
}

// Mark alert as read
export async function markAlertAsRead(alertId: string) {
  return prisma.priceAlert.update({
    where: { id: alertId },
    data: { isRead: true },
  });
}

// Get price history for a product across snapshots
export async function getPriceHistory(competitorId: string, productName?: string, categoryUrl?: string) {
  const where: Record<string, unknown> = { competitorId };
  if (categoryUrl) where.categoryUrl = categoryUrl;

  const snapshots = await prisma.priceSnapshot.findMany({
    where,
    orderBy: { scannedAt: 'asc' },
    select: { products: true, scannedAt: true },
  });

  if (!productName) {
    // Return all unique product names with their price history
    const productMap: Record<string, Array<{ date: string; price: number }>> = {};

    for (const snap of snapshots) {
      const products = snap.products as unknown as ProductPrice[];
      for (const p of products) {
        if (!productMap[p.name]) productMap[p.name] = [];
        productMap[p.name].push({ date: snap.scannedAt.toISOString(), price: p.price });
      }
    }

    return productMap;
  }

  // Return history for a specific product
  const nameLower = productName.toLowerCase();
  const history: Array<{ date: string; price: number }> = [];

  for (const snap of snapshots) {
    const products = snap.products as unknown as ProductPrice[];
    const match = products.find(p => p.name.toLowerCase().includes(nameLower) || nameLower.includes(p.name.toLowerCase()));
    if (match) {
      history.push({ date: snap.scannedAt.toISOString(), price: match.price });
    }
  }

  return history;
}

// Auto-scan: find and run stale schedules
export async function runStaleScanSchedules() {
  const now = new Date();

  const staleSchedules = await prisma.scanSchedule.findMany({
    where: {
      isActive: true,
      OR: [
        { nextRunAt: null },
        { nextRunAt: { lt: now } },
      ],
    },
    include: { competitor: { select: { id: true, name: true, categoryUrls: true } } },
  });

  const results: Array<{ competitorId: string; categoryUrl: string; status: string }> = [];

  for (const schedule of staleSchedules) {
    // Update schedule timestamps
    const interval = schedule.frequency === 'DAILY' ? 1 : 7;
    const nextRun = new Date(now);
    nextRun.setDate(nextRun.getDate() + interval);

    await prisma.scanSchedule.update({
      where: { id: schedule.id },
      data: { lastRunAt: now, nextRunAt: nextRun },
    });

    results.push({
      competitorId: schedule.competitorId,
      categoryUrl: schedule.categoryUrl,
      status: 'scheduled',
    });
  }

  return { scanned: results.length, schedules: results };
}

// Manage scan schedules
export async function createScanSchedule(competitorId: string, categoryUrl: string, frequency: string = 'WEEKLY') {
  return prisma.scanSchedule.upsert({
    where: { competitorId_categoryUrl: { competitorId, categoryUrl } },
    update: { frequency, isActive: true },
    create: { competitorId, categoryUrl, frequency },
  });
}

export async function getScanSchedules(competitorId: string) {
  return prisma.scanSchedule.findMany({
    where: { competitorId, isActive: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function deleteScanSchedule(scheduleId: string) {
  return prisma.scanSchedule.update({
    where: { id: scheduleId },
    data: { isActive: false },
  });
}
