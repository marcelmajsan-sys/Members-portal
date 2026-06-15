import { z } from 'zod';

export const certificationStatusEnum = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED']);

export const submitCertificationSchema = z.object({
  websiteUrl: z.string().url(),
  companyName: z.string().min(1),
  oib: z.string().length(11),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional(),
  hasReturnPolicy: z.boolean(),
  hasPrivacyPolicy: z.boolean(),
  hasTermsOfService: z.boolean(),
  paymentMethods: z.array(z.string()).min(1),
  shippingInfo: z.string().optional(),
  additionalNotes: z.string().optional(),
});

export const updateCertificationStatusSchema = z.object({
  status: certificationStatusEnum,
  reviewNotes: z.string().optional(),
});

export type SubmitCertificationInput = z.infer<typeof submitCertificationSchema>;
export type UpdateCertificationStatusInput = z.infer<typeof updateCertificationStatusSchema>;
