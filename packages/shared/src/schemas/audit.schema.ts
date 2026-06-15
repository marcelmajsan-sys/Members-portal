import { z } from 'zod';

export const runAuditSchema = z.object({
  websiteUrl: z.string().url(),
});

export type RunAuditInput = z.infer<typeof runAuditSchema>;
