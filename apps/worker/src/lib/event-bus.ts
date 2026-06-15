import { createQueue, AUTOMATION_QUEUE } from './queue.js';
import { logger } from './logger.js';

const automationQueue = createQueue(AUTOMATION_QUEUE);

export async function emit(
  event: string,
  payload: Record<string, unknown>,
): Promise<void> {
  logger.debug({ event, payload }, 'Emitting event');
  await automationQueue.add(event, { event, payload });
}

export async function schedule(
  event: string,
  payload: Record<string, unknown>,
  delay: number,
): Promise<void> {
  logger.debug({ event, payload, delay }, 'Scheduling delayed event');
  await automationQueue.add(event, { event, payload }, { delay });
}

export async function scheduleCron(
  name: string,
  event: string,
  payload: Record<string, unknown>,
  cron: string,
): Promise<void> {
  logger.info({ name, event, cron }, 'Scheduling cron job');
  await automationQueue.add(
    event,
    { event, payload },
    {
      repeat: {
        pattern: cron,
      },
      jobId: name,
    },
  );
}

export const eventBus = { emit, schedule, scheduleCron };
