import { Resend } from "resend";

// API ključ se čita iz okruženja (RESEND_API_KEY). Ako nije postavljen,
// slanje se ionako preskače u dev modu (vidi send.ts), a u produkciji
// Resend vraća jasnu grešku.
export const resend = new Resend(process.env.RESEND_API_KEY ?? "");
