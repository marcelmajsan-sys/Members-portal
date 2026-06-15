import { logger } from './lib/logger.js';
import { createWorker, AUTOMATION_QUEUE, EMAIL_QUEUE, RENEWAL_QUEUE } from './lib/queue.js';
import { scheduleCron } from './lib/event-bus.js';
import { automationProcessor } from './processors/automation.processor.js';
import { emailProcessor } from './processors/email.processor.js';
import { renewalProcessor } from './processors/renewal.processor.js';
import type { AutomationJob, EmailJob, RenewalJob } from './types.js';

async function main(): Promise<void> {
  logger.info('Starting automation engine...');

  // Start workers
  const automationWorker = createWorker<AutomationJob>(AUTOMATION_QUEUE, automationProcessor);
  const emailWorker = createWorker<EmailJob>(EMAIL_QUEUE, emailProcessor);
  const renewalWorker = createWorker<RenewalJob>(RENEWAL_QUEUE, renewalProcessor);

  automationWorker.on('completed', (job) => {
    logger.debug({ jobId: job.id, name: job.name }, 'Automation job completed');
  });

  automationWorker.on('failed', (job, error) => {
    logger.error({ jobId: job?.id, name: job?.name, error: error.message }, 'Automation job failed');
  });

  emailWorker.on('completed', (job) => {
    logger.debug({ jobId: job.id, name: job.name }, 'Email job completed');
  });

  emailWorker.on('failed', (job, error) => {
    logger.error({ jobId: job?.id, name: job?.name, error: error.message }, 'Email job failed');
  });

  renewalWorker.on('completed', (job) => {
    logger.debug({ jobId: job.id, name: job.name }, 'Renewal job completed');
  });

  renewalWorker.on('failed', (job, error) => {
    logger.error({ jobId: job?.id, name: job?.name, error: error.message }, 'Renewal job failed');
  });

  // Schedule daily renewal check at 8:00 AM
  await scheduleCron(
    'daily-renewal-check',
    'renewal.check',
    { type: 'check' },
    '0 8 * * *',
  );

  logger.info({
    queues: [AUTOMATION_QUEUE, EMAIL_QUEUE, RENEWAL_QUEUE],
  }, 'Automation engine started — all workers running');

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutting down automation engine...');

    await Promise.all([
      automationWorker.close(),
      emailWorker.close(),
      renewalWorker.close(),
    ]);

    logger.info('Automation engine stopped');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  logger.fatal({ error }, 'Failed to start automation engine');
  process.exit(1);
});
