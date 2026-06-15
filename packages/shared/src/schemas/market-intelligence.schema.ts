import { z } from 'zod';

export const createMarketIntelligenceSchema = z.object({
  title: z.string().min(1),
  category: z.string().min(1),
  content: z.record(z.unknown()),
  source: z.string().optional(),
  publishedAt: z.string().datetime().optional(),
});

export const updateMarketIntelligenceSchema = createMarketIntelligenceSchema.partial();

export const marketIntelligenceQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  category: z.string().optional(),
});

export type CreateMarketIntelligenceInput = z.infer<typeof createMarketIntelligenceSchema>;
export type UpdateMarketIntelligenceInput = z.infer<typeof updateMarketIntelligenceSchema>;
