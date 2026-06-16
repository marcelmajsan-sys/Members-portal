import { Resend } from "resend";

// API ključ se čita iz okruženja (RESEND_API_KEY). Placeholder se koristi samo
// da konstruktor ne baci grešku pri učitavanju modula kad ključ nije postavljen
// (inače bi cijeli API pao, ne samo slanje emaila). Stvarno slanje bez ključa
// vraća grešku koju send.ts obrađuje.
export const resend = new Resend(process.env.RESEND_API_KEY || "re_missing_key");
