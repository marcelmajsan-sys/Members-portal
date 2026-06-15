import { z } from 'zod';

export const notificationTypeEnum = z.enum(['INFO', 'WARNING', 'ACTION', 'REMINDER']);

export const createNotificationSchema = z.object({
  userId: z.string().cuid(),
  type: notificationTypeEnum.optional(),
  title: z.string().min(1),
  message: z.string().min(1),
  actionUrl: z.string().url().optional(),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
