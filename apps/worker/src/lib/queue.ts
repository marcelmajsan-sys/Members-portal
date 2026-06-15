import { Queue, Worker, type Processor } from 'bullmq';
import { config } from '../config.js';

export const AUTOMATION_QUEUE = 'automation';
export const EMAIL_QUEUE = 'email';
export const RENEWAL_QUEUE = 'renewal';

const connectionConfig = { url: config.REDIS_URL };

export function createQueue(name: string): Queue {
  return new Queue(name, { connection: connectionConfig });
}

export function createWorker<T = unknown>(
  name: string,
  processor: Processor<T>,
): Worker<T> {
  return new Worker<T>(name, processor, { connection: connectionConfig });
}
