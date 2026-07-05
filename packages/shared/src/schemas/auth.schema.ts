import { z } from 'zod';

// Poruke na hrvatskom — validacijske greške se prikazuju direktno korisniku u UI-ju
export const loginSchema = z.object({
  email: z.string().email('Neispravna email adresa'),
  password: z.string().min(6, 'Lozinka mora imati najmanje 6 znakova'),
});

export const registerSchema = z.object({
  email: z.string().email('Neispravna email adresa'),
  password: z.string().min(6, 'Lozinka mora imati najmanje 6 znakova'),
  firstName: z.string().min(1, 'Ime je obavezno'),
  lastName: z.string().min(1, 'Prezime je obavezno'),
  companyName: z.string().min(1, 'Naziv tvrtke je obavezan'),
  oib: z.string().length(11, 'OIB mora imati točno 11 znamenki'),
  memberType: z.enum(['WEB_TRADER', 'SERVICE_PROVIDER', 'PHYSICAL'], {
    errorMap: () => ({ message: 'Neispravan tip članstva' }),
  }),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Neispravna email adresa'),
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(6, 'Lozinka mora imati najmanje 6 znakova'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
