import type { Job } from 'bullmq';
import { prisma } from '@ecommerce-hr/db';
import { DomainEvents } from '@ecommerce-hr/shared';
import { logger } from '../lib/logger.js';
import { emit } from '../lib/event-bus.js';
import type { RenewalJob } from '../types.js';

export async function renewalProcessor(job: Job<RenewalJob>): Promise<void> {
  logger.info({ type: job.data.type, jobId: job.id }, 'Processing renewal job');

  if (job.data.type === 'remind' && job.data.memberId) {
    await remindMember(job.data.memberId);
    return;
  }

  await checkExpiringMembers();
  await expireOverdueMembers();
}

async function checkExpiringMembers(): Promise<void> {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const expiringMembers = await prisma.member.findMany({
    where: {
      status: 'ACTIVE',
      expiresAt: {
        gte: now,
        lte: thirtyDaysFromNow,
      },
    },
    include: {
      user: true,
      company: true,
    },
  });

  logger.info({ count: expiringMembers.length }, 'Found expiring members');

  for (const member of expiringMembers) {
    const daysUntilExpiry = Math.ceil(
      (member.expiresAt!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
    );

    await prisma.notification.create({
      data: {
        userId: member.userId,
        type: 'REMINDER',
        title: 'Članarina uskoro istječe',
        message: `Vaša članarina istječe za ${daysUntilExpiry} dana. Molimo obnovite članstvo.`,
        actionUrl: '/membership/renew',
      },
    });

    await emit(DomainEvents.MEMBER_EXPIRED, {
      memberId: member.id,
      userId: member.userId,
      email: member.user.email,
      firstName: member.user.firstName,
      lastName: member.user.lastName,
      companyName: member.company.name,
      daysUntilExpiry,
      expiresAt: member.expiresAt!.toISOString(),
    });
  }
}

async function remindMember(memberId: string): Promise<void> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { user: true, company: true },
  });

  if (!member || !member.expiresAt) {
    logger.warn({ memberId }, 'Member not found or no expiry date');
    return;
  }

  const now = new Date();
  const daysUntilExpiry = Math.ceil(
    (member.expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
  );

  await prisma.notification.create({
    data: {
      userId: member.userId,
      type: 'WARNING',
      title: 'Podsjetnik za obnovu članarine',
      message: `Vaša članarina istječe za ${daysUntilExpiry} dana.`,
      actionUrl: '/membership/renew',
    },
  });

  logger.info({ memberId, daysUntilExpiry }, 'Renewal reminder sent');
}

async function expireOverdueMembers(): Promise<void> {
  const now = new Date();

  const expiredMembers = await prisma.member.findMany({
    where: {
      status: 'ACTIVE',
      expiresAt: {
        lt: now,
      },
    },
    include: {
      user: true,
    },
  });

  for (const member of expiredMembers) {
    await prisma.member.update({
      where: { id: member.id },
      data: { status: 'EXPIRED' },
    });

    await prisma.notification.create({
      data: {
        userId: member.userId,
        type: 'WARNING',
        title: 'Članarina je istekla',
        message: 'Vaša članarina je istekla. Molimo obnovite članstvo za nastavak korištenja usluga.',
        actionUrl: '/membership/renew',
      },
    });

    logger.info({ memberId: member.id, email: member.user.email }, 'Member expired');
  }

  if (expiredMembers.length > 0) {
    logger.info({ count: expiredMembers.length }, 'Expired overdue members');
  }
}
