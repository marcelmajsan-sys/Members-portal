import { z } from 'zod';

export const createBenchmarkSchema = z.object({
  category: z.string().min(1),
  metric: z.string().min(1),
  value: z.coerce.number(),
  period: z.string().min(1),
  region: z.string().default('HR'),
});

export const updateBenchmarkSchema = createBenchmarkSchema.partial();

export const benchmarkQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  category: z.string().optional(),
  period: z.string().optional(),
  region: z.string().optional(),
});

export type CreateBenchmarkInput = z.infer<typeof createBenchmarkSchema>;
export type UpdateBenchmarkInput = z.infer<typeof updateBenchmarkSchema>;
