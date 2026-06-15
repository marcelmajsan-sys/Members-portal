import { prisma } from '@ecommerce-hr/db';
import { runCompetitorScan } from '@ecommerce-hr/ai';
import { emitEvent } from '../lib/event-bus.js';
import { DomainEvents } from '@ecommerce-hr/shared';
import { logger } from '../utils/logger.js';

export async function createCompetitor(data: {
  name: string;
  website: string;
  industry?: string;
  categoryUrls?: string[];
}) {
  const competitor = await prisma.competitor.create({ data });

  await emitEvent(DomainEvents.COMPETITOR_CREATED, {
    competitorId: competitor.id,
    name: competitor.name,
    website: competitor.website,
  });

  return competitor;
}

export async function getCompetitors(
  filters: { industry?: string },
  page: number,
  limit: number,
) {
  const where: Record<string, unknown> = { isActive: true };
  if (filters.industry) where.industry = filters.industry;

  const skip = (page - 1) * limit;

  const [competitors, total] = await Promise.all([
    prisma.competitor.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.competitor.count({ where }),
  ]);

  return { competitors, total };
}

export async function getCompetitorById(id: string) {
  return prisma.competitor.findUnique({
    where: { id },
    include: {
      scans: {
        orderBy: { scannedAt: 'desc' },
        take: 5,
      },
    },
  });
}

export async function updateCompetitor(
  id: string,
  data: Partial<{ name: string; website: string; industry: string; categoryUrls: string[] }>,
) {
  return prisma.competitor.update({ where: { id }, data });
}

export async function deleteCompetitor(id: string) {
  return prisma.competitor.update({
    where: { id },
    data: { isActive: false },
  });
}

export async function scanCompetitor(id: string) {
  const competitor = await prisma.competitor.findUnique({ where: { id } });
  if (!competitor) throw new Error('Competitor not found');

  try {
    const metrics = await runCompetitorScan(
      competitor.name,
      competitor.website,
      competitor.industry ?? undefined,
    );

    const scan = await prisma.competitorScan.create({
      data: {
        competitorId: id,
        metrics: JSON.parse(JSON.stringify(metrics)),
      },
    });

    await emitEvent(DomainEvents.COMPETITOR_SCAN_COMPLETED, {
      competitorId: id,
      scanId: scan.id,
      score: metrics.score,
    });

    return scan;
  } catch (error) {
    logger.error({ error, competitorId: id }, 'Competitor scan failed');
    throw error;
  }
}

export async function getCompetitorScans(competitorId: string, page: number, limit: number) {
  const skip = (page - 1) * limit;

  const [scans, total] = await Promise.all([
    prisma.competitorScan.findMany({
      where: { competitorId },
      skip,
      take: limit,
      orderBy: { scannedAt: 'desc' },
    }),
    prisma.competitorScan.count({ where: { competitorId } }),
  ]);

  return { scans, total };
}
