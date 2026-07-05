import { prisma } from '@ecommerce-hr/db';
import { DomainEvents } from '@ecommerce-hr/shared';
import { emitEvent } from '../lib/event-bus.js';
import { logger } from '../utils/logger.js';

export interface RenewalStats {
  expiringFound: number;
  remindersSent: number;
  expired: number;
}

const DAY = 24 * 60 * 60 * 1000;

// Članovi kojima članstvo ističe unutar 30 dana → obavijest + event (pokreće automatizaciju za podsjetnik).
async function checkExpiringMembers(stats: RenewalStats): Promise<void> {
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * DAY);

  const expiring = await prisma.member.findMany({
    where: { status: 'ACTIVE', expiresAt: { gte: now, lte: in30 } },
    include: { user: true, company: true },
  });
  stats.expiringFound = expiring.length;

  for (const m of expiring) {
    const days = Math.ceil((m.expiresAt!.getTime() - now.getTime()) / DAY);
    await prisma.notification.create({
      data: {
        userId: m.userId,
        type: 'REMINDER',
        title: 'Članarina uskoro istječe',
        message: `Vaša članarina istječe za ${days} dana. Molimo obnovite članstvo.`,
        actionUrl: '/membership/renew',
      },
    });
    // 'member.expiry_reminder' — isti event kao ručni /renewal-check; na njega slušaju
    // automatizacije podsjetnika (30/14/7 dana). Prije se ovdje krivo emitirao
    // 'member.expired' pa bi "Obavijest o isteku" išla mjesec dana prerano.
    await emitEvent('member.expiry_reminder', {
      memberId: m.id, userId: m.userId, email: m.user.email,
      firstName: m.user.firstName, lastName: m.user.lastName,
      companyName: m.company.name, daysUntilExpiry: days, expiresAt: m.expiresAt!.toISOString(),
      memberTier: m.memberTier,
    });
    stats.remindersSent++;
  }
}

// Članovi kojima je članstvo prošlo → status EXPIRED + obavijest.
async function expireOverdueMembers(stats: RenewalStats): Promise<void> {
  const now = new Date();
  const overdue = await prisma.member.findMany({
    where: { status: 'ACTIVE', expiresAt: { lt: now } },
    include: { user: true },
  });

  for (const m of overdue) {
    await prisma.member.update({ where: { id: m.id }, data: { status: 'EXPIRED' } });
    await prisma.notification.create({
      data: {
        userId: m.userId,
        type: 'WARNING',
        title: 'Članarina je istekla',
        message: 'Vaša članarina je istekla. Molimo obnovite članstvo za nastavak korištenja usluga.',
        actionUrl: '/membership/renew',
      },
    });
    // Tek OVDJE članstvo stvarno istječe — okida automatizaciju "Obavijest o isteku"
    await emitEvent(DomainEvents.MEMBER_EXPIRED, { memberId: m.id, userId: m.userId });
    stats.expired++;
  }
}

/** Dnevna provjera obnova — pokreće je Vercel cron (/api/cron/daily-renewal). */
export async function runDailyRenewal(): Promise<RenewalStats> {
  const stats: RenewalStats = { expiringFound: 0, remindersSent: 0, expired: 0 };
  await checkExpiringMembers(stats);
  await expireOverdueMembers(stats);
  logger.info({ stats }, 'Dnevna provjera obnova gotova');
  return stats;
}
