import { z } from 'zod';

export const createMemberSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  companyName: z.string().min(1),
  oib: z.string().length(11),
  memberType: z.enum(['WEB_TRADER', 'SERVICE_PROVIDER', 'PHYSICAL']),
  address: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  postalCode: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  website: z.string().url().optional(),
});

export const updateMemberSchema = createMemberSchema.partial();

export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
