# Pokretanje (lokalno) — eCommerce HR OS (tvoja kopija)

Projekt je migriran s AWS-a na **Supabase** (baza) + **Vercel** (hosting, kasnije) + **Resend** (email, kasnije).

## Prvi put / nakon restarta računala

1. Otvori **PowerShell** u ovoj mapi (`C:\Users\marce\Desktop\ecommerce-hr-os-moj`)
2. Pokreni:
   ```powershell
   pnpm dev:admin
   ```
   Ovo pokreće **API** (port 3001) i **admin panel** (port 3003) zajedno.
3. Otvori u pregledniku: **http://localhost:3003**
4. Prijava:
   - Email: `marcel@ecommerce.hr`
   - Lozinka: `admin123`

> Za zaustavljanje: u PowerShellu pritisni `Ctrl + C`.

## Korisni podaci

| Što | Vrijednost |
|-----|-----------|
| Admin panel | http://localhost:3003 |
| API | http://localhost:3001/api/health |
| Baza | Supabase (eu-central-1), konekcija u `.env` → `DATABASE_URL` |
| Admin login | `marcel@ecommerce.hr` / `admin123` |
| Operator login | `iva@ecommerce.hr` / `admin123` |

## Baza (Supabase)

- Sve tablice su već kreirane (`prisma db push`) i napunjene test podacima (`pnpm db:seed`).
- Pregled podataka: Supabase dashboard → **Table Editor**, ili lokalno `pnpm db:studio`.
- Ako promijeniš Prisma shemu (`packages/db/prisma/schema.prisma`):
  ```powershell
  pnpm --filter @ecommerce-hr/db exec prisma db push
  ```

## Što još NIJE napravljeno (sljedeći koraci)

- [ ] **Email (Resend)** — trenutno se emailovi ispisuju u konzolu. Treba prepisati `packages/email` sa SES-a na Resend + upisati `RESEND_API_KEY` u `.env`.
- [ ] **Deploy na Vercel** — spojiti tvoj Vercel račun, postaviti env varijable (`DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `NEXT_PUBLIC_API_URL`), deploy API-ja i admin panela.
- [ ] **Worker (Redis/BullMQ)** — pozadinski poslovi (obnove, automatizacija). Opcionalno, kasnije preko Vercel Cron.

## Tajne (NE dijeliti)

`.env` sadrži lozinku baze i JWT ključeve. Ne stavljaj ga na GitHub (već je u `.gitignore`).
