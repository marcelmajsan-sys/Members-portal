import { z } from 'zod';

const sequenceStepSchema = z.object({
  type: z.enum(['SEND_EMAIL', 'WAIT', 'CONDITION', 'WEBHOOK', 'UPDATE_RECORD']),
  config: z.record(z.unknown()),
  order: z.number().int().min(0),
});

export const createSequenceSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  triggerEvent: z.string().min(1).max(255),
  steps: z.array(sequenceStepSchema).min(1),
  status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']).optional(),
});

export const updateSequenceSchema = createSequenceSchema.partial();

export const updateSequenceStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']),
});

export const webhookPaymentSchema = z.object({
  paymentId: z.string().min(1),
  status: z.enum(['completed', 'failed']),
  amount: z.number().positive().optional(),
});

export const testEventSchema = z.object({
  event: z.string().min(1),
  payload: z.record(z.unknown()).default({}),
});

export type CreateSequenceInput = z.infer<typeof createSequenceSchema>;
export type UpdateSequenceInput = z.infer<typeof updateSequenceSchema>;
export type UpdateSequenceStatusInput = z.infer<typeof updateSequenceStatusSchema>;
export type WebhookPaymentInput = z.infer<typeof webhookPaymentSchema>;
export type TestEventInput = z.infer<typeof testEventSchema>;
