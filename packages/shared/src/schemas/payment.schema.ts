import { z } from 'zod';

export const checkoutSchema = z.object({
  memberId: z.string(),
  amount: z.number().positive(),
  currency: z.string().default('EUR'),
  description: z.string(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
