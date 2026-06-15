import { Router } from 'express';
import { webhookPaymentSchema, testEventSchema } from '@ecommerce-hr/shared';
import { validate } from '../middleware/validate.js';
import { successResponse, errorResponse } from '../utils/api-response.js';
import { logger } from '../utils/logger.js';
import { processPaymentWebhook } from '../services/payment.service.js';
import { emitEvent } from '../lib/event-bus.js';
import { env } from '../config/env.js';

const router = Router();

// POST /payment — receive payment webhook from provider
router.post('/payment', validate(webhookPaymentSchema), async (req, res) => {
  const { paymentId, status } = req.body;

  try {
    const payment = await processPaymentWebhook(paymentId, status);
    logger.info({ paymentId, status }, 'Payment webhook processed');
    successResponse(res, { payment });
  } catch (error) {
    const message = (error as Error).message;
    if (message === 'Payment not found') {
      errorResponse(res, 'NOT_FOUND', 'Payment not found', 404);
      return;
    }
    logger.error(error, 'Failed to process payment webhook');
    errorResponse(res, 'INTERNAL_ERROR', 'Failed to process webhook', 500);
  }
});

// POST /test — dev-only endpoint to manually trigger events
router.post('/test', validate(testEventSchema), async (req, res) => {
  if (env.NODE_ENV === 'production') {
    errorResponse(res, 'FORBIDDEN', 'Test endpoint is not available in production', 403);
    return;
  }

  const { event, payload } = req.body;

  try {
    await emitEvent(event, payload);
    logger.info({ event, payload }, 'Test event emitted');
    successResponse(res, { event, payload, emitted: true });
  } catch (error) {
    logger.error(error, 'Failed to emit test event');
    errorResponse(res, 'INTERNAL_ERROR', 'Failed to emit event', 500);
  }
});

export default router;
