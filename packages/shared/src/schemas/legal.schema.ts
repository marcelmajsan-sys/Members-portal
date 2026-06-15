import { z } from 'zod';

export const submitLegalQuerySchema = z.object({
  question: z.string().min(10).max(5000),
  category: z.string().optional(),
});

export type SubmitLegalQueryInput = z.infer<typeof submitLegalQuerySchema>;
