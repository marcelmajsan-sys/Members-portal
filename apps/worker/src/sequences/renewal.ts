import { prisma } from '@ecommerce-hr/db';
import { createQueue, EMAIL_QUEUE } from '../lib/queue.js';
import { logger } from '../lib/logger.js';

const emailQueue = createQueue(EMAIL_QUEUE);

const REMINDER_THRESHOLDS = [30, 14, 7, 3, 1] as const;

/**
 * Daily renewal check — run as a cron job.
 *
 * - Finds members expiring at 30, 14, 7, 3, 1 day thresholds
 * - Sends appropriate reminder emails at each threshold
 * - Creates notifications for the member
 * - Creates tasks for operators for members expiring in < 7 days
 * - Updates expired members' status to EXPIRED
 */
export async function executeRenewalCheck(): Promise<void> {
  const now = new Date();

  logger.info('Starting daily renewal check');

  // Check each threshold
  for (const days of REMINDER_THRESHOLDS) {
    const targetDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    const members = await prisma.member.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      include: {
        user: true,
        company: true,
      },
    });

    for (const member of members) {
      const { user, company } = member;

      logger.info(
        { memberId: member.id, email: user.email, daysUntilExpiry: days },
        'Sending renewal reminder',
      );

      // Send reminder email
      const templateMap: Record<number, string> = {
        30: 'renewal-30-days',
        14: 'renewal-14-days',
        7: 'renewal-7-days',
        3: 'renewal-3-days',
        1: 'renewal-1-day',
      };

      await emailQueue.add(`renewal-reminder-${member.id}-${days}`, {
        to: user.email,
        subject: `Vaša članarina istječe za ${days} ${days === 1 ? 'dan' : 'dana'}`,
        template: templateMap[days] ?? 'renewal-reminder',
        templateData: {
          memberId: member.id,
          firstName: user.firstName,
          lastName: user.lastName,
          companyName: company.name,
          daysUntilExpiry: days,
          expiresAt: member.expiresAt!.toISOString(),
        },
      });

      // Create notification for the member
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: days <= 3 ? 'WARNING' : 'REMINDER',
          title: 'Podsjetnik za obnovu članarine',
          message: `Vaša članarina istječe za ${days} ${days === 1 ? 'dan' : 'dana'}. Molimo obnovite članstvo.`,
          actionUrl: '/membership/renew',
        },
      });

      // Create task for operators when expiry is < 7 days
      if (days < 7) {
        const operators = await prisma.user.findMany({
          where: { role: 'OPERATOR', isActive: true },
        });

        for (const operator of operators) {
          await prisma.task.create({
            data: {
              title: `Kontaktirati člana - istječe članarina`,
              description: `Član ${user.firstName} ${user.lastName} (${company.name}) - članarina istječe za ${days} ${days === 1 ? 'dan' : 'dana'}.`,
              assignedToId: operator.id,
              priority: days <= 1 ? 'URGENT' : 'HIGH',
              dueAt: member.expiresAt,
            },
          });
        }
      }
    }

    if (members.length > 0) {
      logger.info({ days, count: members.length }, 'Renewal reminders sent for threshold');
    }
  }

  // Expire overdue members
  const expiredMembers = await prisma.member.updateMany({
    where: {
      status: 'ACTIVE',
      expiresAt: {
        lt: now,
      },
    },
    data: {
      status: 'EXPIRED',
    },
  });

  if (expiredMembers.count > 0) {
    logger.info({ count: expiredMembers.count }, 'Members marked as expired');
  }

  logger.info('Daily renewal check completed');
}
