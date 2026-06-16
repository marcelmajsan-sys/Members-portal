# CLAUDE.md

Interni OS za Udrugu eCommerce Hrvatska. pnpm monorepo (Turborepo): Express API + Next.js admin panel, Prisma + PostgreSQL.

**Stack (migrirano s AWS-a):** Supabase Postgres · Vercel (API + admin panel) · Resend (email) · Anthropic (AI sažeci). Stari AWS stack (Lambda/RDS/SES/S3/Redis-BullMQ) se **više ne koristi**.

## Ključne putanje

```
apps/api/src/routes/os.routes.ts          — glavni admin API (~1000 linija)
apps/api/src/routes/index.ts              — registracija svih ruta
apps/api/src/routes/inbound.routes.ts     — cron endpointi (fetch-inbound, daily-renewal)
apps/api/src/app.ts                       — Express setup, CORS, email logger
apps/api/api/index.ts                     — Vercel serverless entry (@ts-nocheck, re-export bundla)
apps/api/build-vercel.mjs                 — esbuild pre-bundle (src/app.ts -> src/app.bundled.mjs)
apps/api/vercel.json                      — buildCommand, crons, maxDuration
apps/api/src/services/inbound-email.service.ts  — IMAP dohvat dolaznih odgovora članova
apps/api/src/services/renewal.service.ts        — dnevna provjera obnova (podsjetnici + auto-istek)
apps/os/src/app/login/page.tsx            — login (logo src="/admin/logo.png")
apps/os/src/app/(dashboard)/             — sve admin stranice (Next.js App Router)
apps/os/next.config.ts                    — basePath:'/admin', images.unoptimized
packages/db/prisma/schema.prisma          — Prisma schema (svi modeli)
packages/email/src/send.ts                — sendEmail() preko Resenda + tracking pixel + logger
packages/email/src/resend-client.ts       — Resend klijent
packages/ai/src/claude.ts                 — Anthropic SDK ask() (claude-opus-4-8)
```

## Infrastruktura

### Supabase (baza)
- Projekt ref `hztbmxxhugpchmbkljgl`, cluster `aws-1-eu-central-1`.
- **Transaction pooler `:6543` + `?pgbouncer=true`** → za serverless (Vercel `DATABASE_URL`). Podnosi paralelne zahtjeve.
- **Session pooler `:5432`** → samo za lokalni `prisma db push` (limit 15 konekcija; pgbouncer ne podržava `db push`). Lokalni `.env` je na 5432; za lokalne read-skripte koristi 6543 ako 5432 javi `EMAXCONNSESSION`.
- Direktna konekcija (`db.<ref>.supabase.co`) je IPv6-only — ne koristiti (računalo nema IPv6).

### Vercel (deploy)
- Tim `marcelmajsan-8321s-projects`. Dva projekta, oba git-connected na `marcelmajsan-sys/Members-portal`, production branch `main`. **Push na `main` auto-deploya oba.**
  - **API**: `members-portal-api` (rootDirectory `apps/api`).
  - **Admin panel**: `members-portal-os` (rootDirectory `apps/os`), domena **members.ecommerce.hr/admin** (gola domena `/` redirecta na `/admin`).
- **API deploy = esbuild pre-bundle**: `build-vercel.mjs` inline-a sve osim `@prisma/client` u `src/app.bundled.mjs`; `api/index.ts` to samo re-exporta. `@vercel/node` tracing NE radi s Express+Prisma+pnpm bez ovoga.
- **Env varijable** se mijenjaju preko Vercel REST API-ja (`POST /v10/projects/{id}/env?upsert=true`) — `vercel env add` kroz PowerShell pipe sprema PRAZNE vrijednosti. Nakon promjene env-a → MORA redeploy.
- rootDirectory se postavlja preko `PATCH /v9/projects/{id}` (CLI nema flag).

### Email (Resend)
- Domena `ecommerce.hr` verificirana u Resendu. FROM = `Udruga eCommerce Hrvatska <udruga@ecommerce.hr>` + `replyTo: udruga@ecommerce.hr` (članovi mogu odgovarati). Env: `EMAIL_FROM`, `EMAIL_REPLY_TO`, `RESEND_API_KEY`.
- **Inbound (dolazni odgovori)**: IMAP (Gmail) na `udruga@ecommerce.hr` povlači odgovore članova, sprema kao `EmailLog` (status `received`, dedup po Message-ID). Vidljivo na profilu člana → "Komunikacija (poslano i primljeno)". Env: `IMAP_USER`, `IMAP_PASSWORD` (Gmail app-password), `CRON_SECRET`.

### Vercel Cron (zamjena za apps/worker)
`apps/worker` (BullMQ/Redis) **uklonjen** — nikad nije bio deployan. Scheduled poslovi idu preko Vercel crona (definirano u `apps/api/vercel.json`, zaštićeno `CRON_SECRET`):
- `GET /api/cron/fetch-inbound` — `0 * * * *` (dohvat dolaznih mailova).
- `GET /api/cron/daily-renewal` — `0 8 * * *` (podsjetnici za istek + auto-EXPIRED).

Automatizacije na događaje rade INLINE u API-ju (event-bus → automation-executor), ne trebaju worker.

### AI (Anthropic)
`packages/ai/src/claude.ts` `ask()` koristi **`claude-opus-4-8`** (bez `temperature` — Opus ga odbija s 400). Svi AI agenti (member-summary, audit, safeshop, inbox, academy, competitor, price) idu kroz isti `ask()`. Env: `ANTHROPIC_API_KEY`.

## Konvencije

- **Zlatno pravilo**: Sve promjene su aditivne. Ništa postojeće se ne smije pokvariti.
- **Prisma**: `prisma db push` za produkciju (ne migrate). Shema je source of truth.
- **Frontend**: Tailwind CSS v4 (`@import "tailwindcss"` + `@theme` blok, nema `tailwind.config.ts`).
- **basePath `/admin`**: `window.location.href` redirecti se ručno prefiksiraju na `/admin/...` (basePath ih ne dira). `next/image` s `unoptimized:true` NE dodaje basePath na `<img src>` → logo putanje moraju eksplicitno uključivati `/admin` (npr. `src="/admin/logo.png"`).
- **Filteri**: Frontend `Set<string>` za active filtere, backend prima comma-separated query parametre.
- **Email logger**: Svaki `sendEmail()` automatski logira u `EmailLog` tablicu (s body-jem).
- **Commit poruke**: Na engleskom, kratke, opisne. **Jezik UI-a**: Hrvatski.
- **Deployment**: Vercel auto na `git push` (oba projekta).
- **KRITIČNO — nakon promjene `apps/api`**: pokreni `cd apps/api && npx tsc --noEmit` PRIJE pusha i provjeri da je API deploy READY (ne samo push). `@vercel/node` tsc korak baca TS7016 na modulima bez tipova (npr. `mailparser`, `bwip-js`) → cijeli deploy ERROR, a esbuild bundle to NE hvata. Netipizirani moduli trebaju shim u `apps/api/src/types/*.d.ts`. Vercel preskače API build kad se mijenja samo `apps/os` — ne oslanjaj se na to da je zadnji push deployan.
- **Quotanje git putanja**: Dashboard putanje imaju zagrade — uvijek quotaj: `git add "apps/os/src/app/(dashboard)/..."`.
