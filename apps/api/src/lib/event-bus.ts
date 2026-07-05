import { logger } from '../utils/logger.js';

export async function emitEvent(event: string, payload: Record<string, unknown> = {}) {
  logger.info({ event, payload }, 'Emitting event');
  // MORA se awaitati do kraja — Vercel zamrzne funkciju nakon odgovora,
  // pa bi fire-and-forget automatizacije (emailovi, logovi) bile presječene. Nikad ne baca.
  try {
    const { executeAutomationEvent } = await import('../services/automation-executor.js');
    await executeAutomationEvent(event, payload);
  } catch (err) {
    logger.error({ event, error: err instanceof Error ? err.message : String(err) }, 'Automation execution failed');
  }
}

export async function emitDelayedEvent(event: string, payload: Record<string, unknown>, _delayMs: number) {
  logger.warn({ event, _delayMs }, 'Delayed events not supported in Lambda — executing immediately');
  await emitEvent(event, payload);
}
