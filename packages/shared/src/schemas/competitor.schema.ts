import { z } from 'zod';

export const createCompetitorSchema = z.object({
  name: z.string().min(1),
  website: z.string().url(),
  industry: z.string().optional(),
  categoryUrls: z.array(z.string().url()).optional().default([]),
});

export const updateCompetitorSchema = z.object({
  name: z.string().min(1).optional(),
  website: z.string().url().optional(),
  industry: z.string().optional(),
  categoryUrls: z.array(z.string().url()).optional(),
});

export const competitorQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  industry: z.string().optional(),
});

export type CreateCompetitorInput = z.infer<typeof createCompetitorSchema>;
export type UpdateCompetitorInput = z.infer<typeof updateCompetitorSchema>;
