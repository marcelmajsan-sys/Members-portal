import { prisma } from '@ecommerce-hr/db';
import { createQueue, EMAIL_QUEUE } from '../lib/queue.js';
import { schedule } from '../lib/event-bus.js';
import { logger } from '../lib/logger.js';

const emailQueue = createQueue(EMAIL_QUEUE);

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Execute the onboarding sequence for a newly registered member.
 *
 * Step 1: Send welcome email immediately
 * Step 2: Wait 1 day
 * Step 3: Create task for Iva: "Pozvati novog člana na uvodni poziv"
 * Step 4: Wait 7 days
 * Step 5: Send "kako ide?" follow-up email
 * Step 6: Create notification for operator: "Provjeriti status novog člana"
 */
export async function executeOnboarding(memberId: string, _userId: string): Promise<void> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: {
      user: true,
      company: true,
    },
  });

  if (!member) {
    logger.error({ memberId }, 'Member not found for onboarding');
    return;
  }

  const { user, company } = member;
  const templateData = {
    memberId: member.id,
    userId: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    companyName: company.name,
  };

  logger.info({ memberId, email: user.email }, 'Starting onboarding sequence');

  // Step 1: Send welcome email immediately
  await emailQueue.add('onboarding-welcome', {
    to: user.email,
    subject: 'Dobrodošli u eCommerce Hrvatska!',
    template: 'welcome',
    templateData,
  });

  // Step 2 + Step 3: After 1 day, create task for Iva
  await schedule(
    'onboarding.intro-call-task',
    {
      ...templateData,
      _action: 'create-task',
      _taskTitle: 'Pozvati novog člana na uvodni poziv',
      _taskDescription: `Novi član: ${user.firstName} ${user.lastName} (${company.name})`,
      _assignedToRole: 'OPERATOR',
    },
    1 * ONE_DAY_MS,
  );

  // Step 4 + Step 5: After 8 days (1 + 7), send follow-up email
  await schedule(
    'onboarding.followup-email',
    {
      ...templateData,
      _action: 'send-email',
      _template: 'onboarding-followup',
      _subject: 'Kako ide? - eCommerce Hrvatska',
    },
    8 * ONE_DAY_MS,
  );

  // Step 6: After 8 days, also create notification for operator
  await schedule(
    'onboarding.check-status-notification',
    {
      ...templateData,
      _action: 'create-notification',
      _notificationTitle: 'Provjeriti status novog člana',
      _notificationMessage: `Provjeriti kako napreduje novi član: ${user.firstName} ${user.lastName} (${company.name})`,
    },
    8 * ONE_DAY_MS,
  );

  logger.info({ memberId }, 'Onboarding sequence scheduled');
}
