import type { Job } from 'bullmq';
import { prisma, type Prisma } from '@ecommerce-hr/db';
import { createQueue, EMAIL_QUEUE, AUTOMATION_QUEUE } from '../lib/queue.js';
import { logger } from '../lib/logger.js';
import type { AutomationJob, SequenceStep } from '../types.js';

const emailQueue = createQueue(EMAIL_QUEUE);
const automationQueue = createQueue(AUTOMATION_QUEUE);

export async function automationProcessor(job: Job<AutomationJob>): Promise<void> {
  const { event, payload } = job.data;

  logger.info({ event, jobId: job.id }, 'Processing automation event');

  const sequences = await prisma.sequence.findMany({
    where: {
      triggerEvent: event,
      status: 'ACTIVE',
    },
  });

  if (sequences.length === 0) {
    logger.debug({ event }, 'No matching sequences found');
    return;
  }

  for (const sequence of sequences) {
    const steps = sequence.steps as unknown as SequenceStep[];

    logger.info(
      { sequenceId: sequence.id, name: sequence.name, stepCount: steps.length },
      'Executing sequence',
    );

    try {
      await executeSteps(steps, payload, sequence.id, event);

      await prisma.automationLog.create({
        data: {
          sequenceId: sequence.id,
          event,
          payload: payload as Prisma.InputJsonValue,
          result: { stepsExecuted: steps.length },
          success: true,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ sequenceId: sequence.id, error: errorMessage }, 'Sequence execution failed');

      await prisma.automationLog.create({
        data: {
          sequenceId: sequence.id,
          event,
          payload: payload as Prisma.InputJsonValue,
          success: false,
          error: errorMessage,
        },
      });
    }
  }
}

async function executeSteps(
  steps: SequenceStep[],
  payload: Record<string, unknown>,
  sequenceId: string,
  event: string,
): Promise<void> {
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    switch (step.type) {
      case 'email': {
        const to = (payload.email as string) ?? '';
        const subject = `[${step.template}] Notification`;
        await emailQueue.add(`email-${sequenceId}-${i}`, {
          to,
          subject,
          template: step.template,
          templateData: payload,
        });

        if (step.delay) {
          // Remaining steps should be re-enqueued with delay
          const remainingSteps = steps.slice(i + 1);
          if (remainingSteps.length > 0) {
            await automationQueue.add(
              `${event}-continuation-${i}`,
              {
                event: `${event}.continuation`,
                payload: { ...payload, _sequenceId: sequenceId, _remainingSteps: remainingSteps },
              },
              { delay: step.delay },
            );
          }
          return;
        }
        break;
      }

      case 'notification': {
        const userId = payload.userId as string | undefined;
        if (userId) {
          await prisma.notification.create({
            data: {
              userId,
              type: 'ACTION',
              title: step.title,
              message: step.message,
            },
          });
        }
        break;
      }

      case 'task': {
        const assignee = await prisma.user.findFirst({
          where: { role: step.assignedToRole as 'OWNER' | 'OPERATOR' | 'MEMBER' | 'PARTNER' },
        });

        await prisma.task.create({
          data: {
            title: step.title,
            description: `Auto-created by sequence for event: ${event}`,
            assignedToId: assignee?.id ?? null,
            priority: 'MEDIUM',
          },
        });
        break;
      }

      case 'wait': {
        const delayMs = step.days * 24 * 60 * 60 * 1000;
        const remainingSteps = steps.slice(i + 1);
        if (remainingSteps.length > 0) {
          await automationQueue.add(
            `${event}-after-wait-${i}`,
            {
              event: `${event}.continuation`,
              payload: { ...payload, _sequenceId: sequenceId, _remainingSteps: remainingSteps },
            },
            { delay: delayMs },
          );
        }
        return; // Stop processing; remaining steps will be picked up after delay
      }
    }
  }
}
