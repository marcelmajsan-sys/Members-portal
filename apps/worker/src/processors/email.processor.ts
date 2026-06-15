import type { Job } from 'bullmq';
import { prisma, type Prisma } from '@ecommerce-hr/db';
import { sendTemplatedEmail } from '@ecommerce-hr/email';
import { logger } from '../lib/logger.js';
import type { EmailJob } from '../types.js';

export async function emailProcessor(job: Job<EmailJob>): Promise<void> {
  const { to, subject, template, templateData } = job.data;

  logger.info({ to, subject, template, jobId: job.id }, 'Processing email job');

  try {
    await sendTemplatedEmail(to, template, { ...templateData, subject });

    await prisma.emailLog.create({
      data: {
        to,
        subject,
        templateName: template,
        status: 'sent',
        metadata: templateData as Prisma.InputJsonValue,
      },
    });

    logger.info({ to, template }, 'Email sent successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ to, template, error: errorMessage }, 'Failed to send email');

    await prisma.emailLog.create({
      data: {
        to,
        subject,
        templateName: template,
        status: 'failed',
        metadata: { ...templateData, error: errorMessage } as Prisma.InputJsonValue,
      },
    });

    throw error; // Re-throw so BullMQ can retry
  }
}
