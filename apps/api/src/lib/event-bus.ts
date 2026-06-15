import { logger } from '../utils/logger.js';

export async function emitEvent(event: string, payload: Record<string, unknown> = {}) {
  logger.info({ event, payload }, 'Emitting event');
  // Fire-and-forget: execute automation sequences inline, never throw to caller
  import('../services/automation-executor.js')
    .then(({ executeAutomationEvent }) => executeAutomationEvent(event, payload))
    .catch((err) => logger.error({ event, error: err instanceof Error ? err.message : String(err) }, 'Automation execution failed'));
}

export async function emitDelayedEvent(event: string, payload: Record<string, unknown>, _delayMs: number) {
  logger.warn({ event, _delayMs }, 'Delayed events not supported in Lambda — executing immediately');
  await emitEvent(event, payload);
}
