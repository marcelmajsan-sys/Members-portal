# CLAUDE.md

Interni OS za Udrugu eCommerce Hrvatska. pnpm monorepo (Turborepo): Express API + Next.js admin panel + Next.js članski portal, Prisma + PostgreSQL.

**Stack (migrirano s AWS-a):** Supabase Postgres · Vercel (API + admin panel) · Resend (email) · Anthropic (AI sažeci). Stari AWS stack (Lambda/RDS/SES/S3/Redis-BullMQ) se **više ne koristi**.

## Ključne putanje

```
apps/api/src/routes/os.routes.ts          — glavni admin API (~1000 linija)
apps/api/src/routes/index.ts              — registracija svih ruta
apps/api/src/routes/inbound.routes.ts     — cron endpointi (fetch-inbound, daily-renewal)
apps/api/src/routes/auth.routes.ts        — login/register/refresh/reset; member login bilježi lastLoginAt + MemberVisit + "Nova prijava"
apps/api/src/routes/member.routes.ts      — member-scoped portal API (profile [bilježi MemberVisit], emails, offers, perks, perks/:id/claim)
apps/api/src/routes/benefit.routes.ts     — /api/os/benefits CRUD + assign + :id/members (admin stranica uklonjena; prikaz vidi "Benefiti" niže)
apps/api/src/routes/conference.routes.ts  — /api/os/conferences CRUD + tickets pregled/potvrda/filteri + CSV export
apps/api/src/routes/ticket.routes.ts      — javno GET /api/tickets/:token (QR) + POST /api/os/tickets/:token/checkin
apps/api/src/services/ticket.service.ts   — kvote ulaznica, CRUD + validacije, QR (bwip-js), emailovi
apps/api/src/routes/notification.routes.ts — list/unread-count/:id read|unread|DELETE/mark-all-read
apps/api/src/services/notification.service.ts — createNotification + notifyStaff() (svi OWNER/OPERATOR)
apps/api/src/services/member.service.ts   — getAllMembers, getMemberPerks/claimMemberPerk, getMemberEmails/Offers, recordMemberVisit
apps/api/src/app.ts                       — Express setup, CORS, email logger
apps/api/api/index.ts                     — Vercel serverless entry (@ts-nocheck, re-export bundla)
apps/api/build-vercel.mjs                 — esbuild pre-bundle (src/app.ts -> src/app.bundled.mjs)
apps/api/vercel.json                      — buildCommand, crons, maxDuration, regions:["fra1"]
apps/api/src/services/inbound-email.service.ts  — IMAP dohvat dolaznih odgovora članova
apps/api/src/services/renewal.service.ts        — dnevna provjera obnova (podsjetnici + auto-istek)
apps/os/src/app/login/page.tsx            — login (logo src="/admin/logo.png")
apps/os/src/app/(dashboard)/             — sve admin stranice (Next.js App Router)
apps/os/src/app/(dashboard)/tickets/page.tsx        — admin Ulaznice (tablica, filteri, check-in, postavke konferencije)
apps/os/src/app/(dashboard)/visits/page.tsx         — admin Posjete članova (povijest posjeta + je li pokrenuta analiza weba)
apps/os/src/app/(dashboard)/notifications/page.tsx  — tabbed inbox (Nove prijave/Zatraženi benefiti/Bilješke...)
apps/os/next.config.ts                    — basePath:'/admin', images.unoptimized
apps/portal/                              — članski portal (Next.js, bez basePatha; root members.ecommerce.hr)
apps/portal/src/app/page.tsx              — članska kontrolna ploča (članstvo, Safe Shop pristupni podaci, benefiti, emailovi, obavijesti, ponude, ulaznice)
apps/portal/src/app/ulaznica/[token]/page.tsx — javna stranica ulaznice s QR kodom (bez prijave)
apps/portal/vercel.json                   — rewrite /admin/* → admin projekt (multi-zones)
packages/db/prisma/schema.prisma          — Prisma schema (svi modeli)
packages/db/prisma/sql/rls-lockdown.sql   — RLS lockdown (idempotentno; re-run nakon nove tablice)
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
- Tim `marcelmajsan-8321s-projects`. **Tri** projekta, svi git-connected na `marcelmajsan-sys/Members-portal`, production branch `main`. **Push na `main` auto-deploya sve.**
  - **API**: `members-portal-api` (rootDirectory `apps/api`).
  - **Admin panel**: `members-portal-os` (rootDirectory `apps/os`, basePath `/admin`). Više NE drži domenu — servira se pod **members.ecommerce.hr/admin** preko rewritea iz portal projekta.
  - **Članski portal**: `members-portal-portal` (rootDirectory `apps/portal`, bez basePatha) — drži domenu **members.ecommerce.hr** (root). `apps/portal/vercel.json` rewritea `/admin/*` → `https://members-portal-os.vercel.app/admin/*` (Next.js multi-zones). Vidi [[member-portal]] memoriju.
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

Automatizacije na događaje rade INLINE u API-ju (event-bus → automation-executor), ne trebaju worker. **`emitEvent()` interno AWAITA executor** (serverless freeze — fire-and-forget bi bio presječen); svi pozivatelji ga awaitaju u try/catch.
- **Podsjetnici za obnovu (30/14/7/0 dana)**: cron dnevno emitira `member.expiry_reminder` (s `daysUntilExpiry`) za sve koji ističu unutar 30 dana — preset automatizacije koriste uvjet **`eq`** (točan dan), NE `lte` (inače bi cooldown slao svakih ~6 dana). Cooldown za renewal grupu je **6 dana** (razmak 14→7 je točno 7). `daysUntilExpiry` je **kalendarski** (UTC ponoć→ponoć; na dan isteka = 0, helper `daysUntilExpiry()` u renewal.service); član je na dan isteka još ACTIVE (dobiva "ističe danas"), **EXPIRED postaje idući dan** i tek tada se emitira `member.expired`.
- **Podsjetnici za obnovu + "expired" email nose predračun (PDF) u privitku**: executor zove `createOffer` (step≥2 ponovno koristi postojeći SENT predračun — isti broj/PDF, ali SAMO ako se iznos poklapa s trenutnim tipom/paketom); FREE članovi nemaju predračun pa email ide bez privitka. Placeholder `{{datum_isteka}}` (+ ime/prezime/tvrtka) zamjenjuje se podacima člana u subjectu i bodyju. Na predračunu je blok kupca = **podaci člana** (ne udruge) i ulazi u HUB-3 barkod.
- 6 preset automatizacija (30/14/7/na dan isteka, dobrodošlica, istek) seedano je u bazu kao **PAUSED** — aktiviraju se toggleom na `/admin/automation`; tamo se mogu i **uređivati** (naziv/okidač/dani/uvjet eq|lte/predložak) i **testirati** (`POST /api/os/sequences/:id/test {email}` — šalje emailove sekvence preskačući status/uvjete/cooldown; gumb avion). **VAŽNO**: `idParamSchema` validira cuid — ručno seedani zapisi (SQL) moraju imati cuid-oblik ID-a (`c` + 24 hex), NE UUID, inače sve `/:id` rute vraćaju 400.
- **Email predlošci** (`/admin/email-templates`, `EmailTemplate` tablica): sistemski (slug u `DEFAULT_TEMPLATES`) + vlastiti. `isActive=false` → šalje se default tekst; **`isHidden=true` = "obrisan"** → skriven s liste i executor NE šalje email (resolveTemplate vraća `'HIDDEN'`). Brisanje sistemskog = `DELETE ?hide=true`; spremanje predloška ga odskriva.

### AI (Anthropic)
`packages/ai/src/claude.ts` `ask()` koristi **`claude-opus-4-8`** (bez `temperature` — Opus ga odbija s 400). Svi AI agenti (member-summary, audit, safeshop, inbox, academy, competitor, price) idu kroz isti `ask()`. Env: `ANTHROPIC_API_KEY`.

### Supabase RLS
Aplikacija NE koristi PostgREST/anon ključ — sav pristup ide kroz Prisma kao rola `postgres` (BYPASSRLS). RLS je uključen na svim tablicama u `public` (bez policy = deny-all za anon/authenticated) + grantovi povučeni. `prisma db push` NE upravlja RLS-om → **nakon dodavanja nove tablice ponovno pokreni `packages/db/prisma/sql/rls-lockdown.sql`** (idempotentno). Dodavanje samo nove kolone ne dira RLS.

## Funkcionalnosti

### Članski portal (apps/portal)
Članovi (rola `MEMBER`) se prijavljuju na **members.ecommerce.hr** i vide: članstvo (tip/tier/status/istek), podatke o članu/tvrtki, **Safe Shop pristupne podatke**, **benefite**, email komunikaciju (modal, sandbox iframe), obavijesti (unread stil + "Označi sve pročitanim"), ponude i **ulaznice**. Zove isti API (`NEXT_PUBLIC_API_URL`). Staff (OWNER/OPERATOR) na portalu se redirecta na `/admin`. Kreiranje pristupa: admin na profilu člana → "Pošalji pristup članu" (`POST /api/os/members/:id/send-invite`, reuse reset_ token flow, link na `${MEMBER_APP_URL}/reset-password`). **Ručno kreirani član dobiva random neupotrebljivu lozinku** — pristup postoji tek nakon invite/reset flowa (nema default lozinke).
- **User↔Member je 1:N (srpanj 2026.)**: `Member.userId` NIJE unique — isti email smije imati više članstava (više webshopova), i za ISTU tvrtku. Webshop članstva je **`Member.website`** (prikaz/analiza: `member.website ?? company.website`). Admin "Dodaj člana": dropdown postojećih tvrtki (`GET /api/os/companies`) ili nova tvrtka (reuse po OIB-u ako postoji), polje Webshop se sprema na Member.website (za novu tvrtku i na Company.website); duplikat se blokira samo za puni trio email+tvrtka+webshop. `deleteMember` briše User tek s posljednjim članstvom. **Uređivanje na profilu člana (kolovoz 2026.)**: modal "Uredi podatke" ima ODVOJENA polja "Web (tvrtka)" i "Webshop (ovo članstvo)" — `PATCH /api/os/members/:id/profile` prima eksplicitne `companyWebsite`/`memberWebsite` (imaju prednost pred legacy `website` koji sam bira metu); kartica "Podaci o firmi" ima gumbe "Uredi" (isti modal) i "+ Webshop" (modal za novo članstvo) + listu ostalih webshopova (članstava) osobe.
- **Portal switcher članstava**: `GET /api/member/memberships` (sva članstva usera) + svi member endpointi primaju opcionalni `?memberId=` (`selectedMemberId()` u member.routes; servisi ga stavljaju u WHERE uz userId iz JWT-a → tuđi ID = 404). Portal sprema odabir u localStorage `selectedMemberId` (helper `mq()` u `apps/portal/src/app/page.tsx`), dropdown se prikazuje kod "Dobrodošli" kad je članstava >1; bez `memberId` API vraća prvo članstvo (`findFirst` + `orderBy createdAt asc`). Uređivanje profila: polje "Web trgovina" ažurira Member.website ako ga članstvo ima, inače Company.website.

### Safe Shop pristupni podaci (srpanj 2026.)
`Member.safeShopEmail` / `Member.safeShopPassword` (plaintext — pristupni podaci za VANJSKI Safe Shop sustav, ne portal lozinka). Admin ih upisuje na profilu člana (kartica "Safe Shop pristupni podaci", sprema se kroz `PATCH /api/os/members/:id/certificates`); član ih vidi na portalu odmah ispod "Podaci o članu" (lozinka skrivena, gumb Prikaži/Sakrij). Inicijalni uvoz iz Safe Shop reset CSV-a: `packages/db/src/import-safeshop-passwords.ts` (izvršeno 17.07.2026., 120/137 upareno — po emailu člana → emailu tvrtke → domeni web trgovine).

### Benefiti (pogodnosti) — ograničeni prikaz vraćen (srpanj 2026.)
Admin stranica/nav "Benefiti" ostaje UKLONJENA (upravljanje samo kroz API/skripte), ali se benefiti opet **prikazuju**: portal sekcija "Vaši benefiti" (ispod Safe Shop podataka; bez claim gumba — ispod liste piše "Zatražite svoj benefit na email udruga@ecommerce.hr") + admin kartica "Benefiti" na profilu člana (`MemberBenefits.tsx`, `GET /api/os/members/:id/benefits` → `getMemberPerksById`).
- **Uvjet `PREMIUM_ONLY`** (`Benefit.condition`): type-targeted benefit vide samo PREMIUM članovi ciljanog tipa — automatski vrijedi i za buduće Premium članove (i nestaje padom na Standard). Seedano (`packages/db/src/seed-premium-benefits.ts`): **"eCommerce Akademija"** (WEB_TRADER) i **"PR objava na webu udruge (3 kom)"** (SERVICE_PROVIDER, `quota: 3`). Dva legacy benefita (CRO Commerce ulaznica, SAFE SHOP cert) su **deaktivirana** (`isActive=false`) — ne reaktivirati bez namjere, odmah bi se prikazali svim članovima tipa.
- **Kvota iskorištenja**: `Benefit.quota` + `MemberBenefit.usedCount`. Admin na profilu člana −/+ brojačem označava iskorišteno (`PATCH /api/os/members/:id/benefits/:benefitId {usedCount}`, clamp 0..quota); portal članu prikazuje "Slobodno x/quota".

### Ulaznice za konferenciju (ULAZNICE-SPEC.md)
`ConferenceTicket` (osoba za ulaznicu; vlasnik = `memberId`; `addedByStaff` = ručno dodao admin) na `Conference` (+ `editDeadline`, `extraDiscount`, `ticketQuotas Json`). Kvota po članu iz `ticketQuotas[TicketType][MemberTier|MemberType]`; **default: STANDARD član → 1 STANDARD, PREMIUM član → 3 VIP**. **Per-member override (kolovoz 2026.)**: `Member.ticketQuotaOverride Json?` (`{"STANDARD": 3}`) ima prednost pred kvotama konferencije i defaultima (po tipu ulaznice; tip bez ključa pada na standardnu kvotu) — primjenjuje se centralno u `getTicketQuota`. Admin UI: kartica "Ulaznice" na profilu člana prikazuje "Kvota za samostalni unos" (iskorišteno/kvota + badge "vlastita kvota") s formom za uređivanje; API `GET|PATCH /api/os/members/:id/ticket-quota` (PATCH body `{override: {STANDARD?, VIP?} | null}`, null briše override kroz `Prisma.DbNull`). Unutar kvote → `CONFIRMED` (email osobi s linkom na `/ulaznica/[token]` + potvrda članu); preko kvote → `PENDING` + `notifyStaff("Zatražena dodatna ulaznica")` + ponuda s `extraDiscount`% popusta (ručno). Backend validacije: vlasništvo iz JWT-a, rok (`editDeadline` → 403; **uključiv do kraja dana** — deadline+24h), duplikat emaila po konferenciji (409; CANCELLED s istim emailom se oživljava). Kvota se provjerava u **serializable transakciji** (paralelni upisi je ne mogu zaobići); token ulaznice = `crypto.randomUUID()` (ne cuid). Member update/delete imaju iste guardove kao create (aktivna konferencija + ACTIVE član); promjena statusa kroz edit šalje iste emailove kao create (PENDING→CONFIRMED = QR email), promjena emaila na CONFIRMED šalje QR novoj adresi; skenirana (checked-in) ulaznica se ne može obrisati. **Admin emailovi (kolovoz 2026.)**: ručno dodavanje prima `sendEmails:false` ("Potvrđena (ne šalje email s ulaznicom)" — kreira CONFIRMED bez ijednog maila); admin PUT šalje emailove SAMO za odobrenje PENDING→CONFIRMED — otkazivanje i vraćanje otkazane (CANCELLED→CONFIRMED) su tihi (bez emaila); za lead vlasnika se preskače i "obavijest članu" (duplikat na isti email). Javna ulaznica: `GET /api/tickets/:token` (samo CONFIRMED, QR = URL ulaznice, rate-limited) — dizajn kopira partner-portal (tamni okvir, QR desno, dvojezična napomena). Check-in: `POST /api/os/tickets/:token/checkin` — jednokratan i **atomaran** (`updateMany` s `checkedInAt: null` u WHERE — dva istovremena skena ne mogu oba proći), drugi sken → 409 s vremenom (UI za check-in namjerno maknut sa `/admin/tickets`). Admin `/admin/tickets`: tablica prijava članova + odvojena sekcija **"RUČNO DODANE"** (`addedByStaff`), filteri (Set<string> → comma-separated), odobri PENDING, **XLSX export u 2 sheeta** ("Ulaznice članova" / "Ručno dodane", `xlsx` paket), postavke konferencije s kvotama po paketu. Na profilu člana (`/members/[id]`, iznad Safe Shop analize) `MemberTickets.tsx` — admin ručno dodaje ulaznice (`POST /api/os/conferences/:id/tickets`, bez kvote, `addedByStaff=true`).

### PWA (članski portal + admin)
`apps/portal` je Progressive Web App: `src/app/manifest.ts` (standalone, theme `#1B365D`), ikone u `public/` (icon-192/512, maskable, apple-touch — generirane iz logo.png), `public/sw.js` (cache-first za statiku, network-first za navigacije, API se NE kešira) + registracija u `src/app/sw-register.tsx` (samo production). Kod bitnih promjena SW logike bumpaj `VERSION` u sw.js.
`apps/os` ima isti PWA setup pod scope `/admin` (manifest id/start_url/scope `/admin`, SW registriran kao `/admin/sw.js`, putanje ikona eksplicitno s `/admin` prefiksom). Dvije zasebne instalabilne aplikacije na istoj domeni (Chrome ih razlikuje po manifest `id`). Instalacija: obje aplikacije imaju **in-app banner "Instaliraj aplikaciju"** (`install-prompt.tsx`, hvata `beforeinstallprompt`; skriven na javnoj `/ulaznica/*`; dismiss se pamti u localStorage) + Chrome ⋮ → "Instaliraj aplikaciju"; iOS Safari nema automatsku ponudu (ručno Share → Dodaj na početni zaslon).
**Role guard**: obje aplikacije dijele localStorage (ista domena!) — portal ne-MEMBER-e šalje na `/admin`, a admin (login + dashboard layout) MEMBER-e šalje na `/` (portal). Bez toga član zapne u adminu s "Insufficient permissions".

### AI analiza weba na portalu (trgovci + nuditelji)
Ista infrastruktura (tablica `WebshopAnalysis`, generički render na portalu — criteria/checkpoints/sections/checklist). **Kvota je PO WEBSHOPU** (kolovoz 2026.): Standard/Free 2, Premium 12 uspješnih analiza u kliznih 365 dana za SVAKI webshop članstva (`memberAnalysisSites` = member.website + company.website bez duplikata; usporedba `siteKey` normaliziranim URL-om protiv `WebshopAnalysis.websiteUrl`). Member endpointi `GET|POST /api/member/webshop-analysis(/quota)` primaju opcionalni `?website=`/body `{website}` — validira se protiv webshopova članstva, default je prvi (member.website ?? company.website). Portal: kad članstvo ima 2 različita weba, u sekciji analize se prikazuju tabovi "Webshop za analizu" (helper `sq()`), svaki s vlastitom kvotom i zadnjom analizom; više članstava (više webshopova) i dalje ide kroz membership switcher.
- **WEB_TRADER** → `runWebshopAnalysis` (6 kategorija: UX/CRO/SEO/Buyer's Journey/Analytics/Legal, Core Web Vitals mobile). LEGAL checkpoint "Gumb za jednostavan raskid ugovora" je **deterministički** (`detectWithdrawalLink` s naslovnice, `applyWithdrawalCheckpoint` overridea model); pozitivan nalaz uvijek nosi napomenu da je za 100% sigurnost potrebna ručna provjera radi li obrazac. Validirano na ~100 shopova (srpanj 2026.): svi pronađeni linkovi živi; detekcija prolazi i informativnu stranicu/PDF, ne samo pravi obrazac.
- **SERVICE_PROVIDER** → `runProviderAnalysis` (`packages/ai/src/provider-analysis-agent.ts`) po uzoru na žirijevu "Stručnu analizu online prisutnosti" za nuditelje (lipanj 2025.): **Best Web** (14 kriterija 0–10 u 4 grupe: Prezentacija ponude, Dizajn, Osnovni SEO, Page speed — PageSpeed score desktop+mobile se mjeri stvarno i dijeli s 10), **Best Copy** (5 DA/NE checkpointa + 5 narativnih sekcija), **Best Marketing** (7 kriterija: FB/IG/LinkedIn + social proof/USP/tracking/KW). Social linkovi i tracking skripte (GA4/GTM/Meta Pixel/LinkedIn/Hotjar) detektiraju se deterministički iz sirovog HTML-a i modelu se daju kao činjenice. Podstranice za nuditelje: usluge/o nama/reference/cjenik (ne kategorija/proizvod).

### Leadovi (potencijalni kontakti, kolovoz 2026.)
`Member.isLead Boolean` + `Member.leadNote String?` — lead je Member zapis (reuse User/Company/bilješki/ulaznica) sa `status=PENDING` i **bez joinedAt/expiresAt**, pa ga renewal cron i automatizacije za ACTIVE članove preskaču; `member.activated` (welcome email) se za lead NE emitira, notifikacija je "Novi lead". Kreiranje: `POST /api/os/members` s `isLead:true` — zajednički modal `apps/os/src/components/lead-add-modal.tsx` (ista polja kao "Dodaj člana" + NAPOMENA) na `/admin/leads` i na `/admin/tickets` (tamo s opcijom "Odmah izradi ulaznicu" → postojeći staff `POST /conferences/:id/tickets`, `addedByStaff=true`, bez kvote; za lead se pri potvrdi ne šalje zasebni "obavijest članu" email jer je osoba = lead). Admin: nav **"Leadovi"** odmah iznad "Članovi" (ownerOnly) → `/admin/leads` (filteri po kategorijama/tipu + pretraga; `GET /api/os/members?isLead=true`); profil `/admin/leads/[id]` ima SAMO osnovne podatke + napomenu (`PATCH /api/os/members/:id/lead-note`), gumb "Uredi podatke" (modal → postojeći `PATCH /api/os/members/:id/profile`), **Bilješke** (postojeći notes endpointi) i **Ulaznice** (`MemberTickets` s `showQuota={false}`); brisanje kroz `DELETE /api/os/members/:id`. Globalna tražilica (searchMembers) NALAZI i leadove — frontend ih označava LEAD bedžom i linka na `/leads/[id]`. **Leadovi su inače svugdje isključeni** (`isLead: false` u WHERE): members lista (getAllMembers default)/counts/CSV export, dashboard statistike i liste, sequence analitika, calendar-event automation trigger, benefit eligible liste, portal `GET /api/member/memberships` (isti email smije biti i član i lead — lead se ne prikazuje u switcheru). Ne-lead ruta na `/admin/leads/[id]` redirecta na `/members/[id]`.

### Obavijesti (admin inbox)
`Notification` je per-user. Admin `/admin/notifications` je tabbed inbox; tip se izvodi iz `title` (getNotifType): **Nove prijave** (`Nova prijava` login / `Novi član` registracija), **Zatraženi benefiti** (`Zatražen benefit`), **Novi zadatak**, **Članarine**, **Bilješke** (`Nova bilješka za člana`). Sidebar badge = unread-count. Dashboard kartice: "Zatraženi benefiti" (broj) + "Nedavne prijave članova" (zadnji login-i, `Member.lastLoginAt`).
- **KRITIČNO (serverless)**: staff-obavijesti (`notifyStaff`) MORAJU se `await`-ati prije `successResponse` — Vercel zamrzne funkciju nakon odgovora pa fire-and-forget upisi znaju biti presječeni (zato su neke obavijesti znale "nestati"). Wrap u try/catch da ne sruše glavnu operaciju.

### Posjete članova (admin analitika)
`MemberVisit` (per-član zapis svakog posjeta portalu) — puna povijest, dok `Member.lastLoginAt` čuva samo zadnji. Bilježi se na dva mjesta: pri svježoj prijavi (`/api/auth/login`, MEMBER) i — jer članovi ostaju prijavljeni ~30 dana pa `/login` rijetko okida — pri **svakom otvaranju portala** kroz `GET /api/member/profile` (`recordMemberVisit`, prigušeno na **1 posjet / 30 min** po članu da refreshevi ne dupliciraju). Admin `/admin/visits` (nav "Posjete članova", ownerOnly) → `GET /api/os/visits`: tko/kada + je li **tijekom posjeta pokrenuta analiza weba** (WebshopAnalysis createdAt u prozoru [ovaj posjet, sljedeći posjet)). Profil člana (`/members/[id]`) ima sekciju "Posjete portalu" → `GET /api/os/members/:id/visits` (svi datumi tog člana). `recordMemberVisit` se awaita prije odgovora (serverless freeze), u try/catch.

### Sigurnost API-ja (uvedeno u dubinskom pregledu, srpanj 2026.)
- **Auth**: `reset_` tokeni se NE prihvaćaju kao refresh tokeni; reset lozinke briše SVE refresh tokene korisnika; deaktiviran korisnik ne može refreshati sesiju; reset token se ne logira. Registracija je transakcijska (User+Company+Member) s pre-checkom OIB-a.
- **Scoping po vlasniku**: notifikacije read/unread/delete i push-token delete scopani na `userId` iz JWT-a (`updateMany`/`deleteMany` s userId u WHERE); safeshop certifikat i legal query po ID-u za MEMBER-a vraćaju samo vlastite; competitor mutacije/scan su staff-only.
- **Javne površine**: `POST /api/webhooks/payment` traži `x-webhook-secret` == env `WEBHOOK_SECRET` (fail closed — bez env-a endpoint odbija sve; postaviti tek kad se integrira payment provider); `/api/audit` je staff-only (Claude poziv = trošak); email click-tracking redirecta samo na `*.ecommerce.hr`; cron secret samo kroz header (ne query).
- **Rate limiting**: express-rate-limit s in-memory storeom (per lambda instanca — resetira se na cold start, samo nominalna zaštita). `authLimiter`: 20/15min po IP-u, **`skipSuccessfulRequests: true`** (uspješne prijave se ne broje — inače testiranje login/logout potroši kvotu). Pravi shared store (Upstash/WAF) je otvorena stavka.
- **Poruke grešaka**: sve poruke koje UI prikazuje korisniku su NA HRVATSKOM (API vraća hrvatske poruke; zod sheme u `packages/shared` imaju hrvatske poruke). Ne vraćati sirove Prisma/engleske poruke prema članu.
- OWNER ne može deaktivirati/degradirati vlastiti račun (employee rute).

## Konvencije

- **Zlatno pravilo**: Sve promjene su aditivne. Ništa postojeće se ne smije pokvariti.
- **Prisma**: `prisma db push` za produkciju (ne migrate). Shema je source of truth. **Prije lokalnog `db push` OBAVEZNO `git pull`** — push sa zastarjelom shemom tiho briše kolone dodane u paralelnoj sesiji (prazne kolone padaju bez upozorenja; incident 17.07.2026.).
- **Frontend**: Tailwind CSS v4 (`@import "tailwindcss"` + `@theme` blok, nema `tailwind.config.ts`).
- **basePath `/admin`**: `window.location.href` redirecti se ručno prefiksiraju na `/admin/...` (basePath ih ne dira). `next/image` s `unoptimized:true` NE dodaje basePath na `<img src>` → logo putanje moraju eksplicitno uključivati `/admin` (npr. `src="/admin/logo.png"`).
- **Filteri**: Frontend `Set<string>` za active filtere, backend prima comma-separated query parametre.
- **Email logger**: Svaki `sendEmail()` automatski logira u `EmailLog` tablicu (s body-jem).
- **Commit poruke**: Na engleskom, kratke, opisne. **Jezik UI-a**: Hrvatski.
- **Deployment**: Vercel auto na `git push` (sva tri projekta: api, os, portal).
- **API regija**: `apps/api/vercel.json` ima `regions:["fra1"]` (uz Supabase u eu-central-1 — bez ovoga je išao iad1/US pa su upiti prelazili Atlantik).
- **CI (GitHub Actions, `.github/workflows/ci.yml`)**: na svaki push na `main` vrti `pnpm lint`, `pnpm typecheck`, `pnpm test` — **prije pusha pokreni i lint** (ne samo tsc), inače CI padne. Jednokratne skripte u `packages/db/src` su isključene iz typechecka (tsconfig exclude); esbuild bundle (`*.bundled.mjs`) je u eslint ignores. Lokalno (Windows on ARM): Prisma library engine (`query_engine-windows.dll.node`) je x64-only i ne može se učitati u arm64 Node — zato je postavljena user env varijabla `PRISMA_CLIENT_ENGINE_TYPE=binary` (x64 `query-engine-windows.exe` radi kroz emulaciju). Ne dirati generator u schemi — Vercel/CI i dalje koriste library engine.
- **Nakon promjene `apps/api`**: tip-greške koje bi srušile Vercel deploy (TS7016 na modulima bez tipova — `@vercel/node` radi vlastiti tsc koji esbuild bundle NE hvata) sada hvata **CI** (`pnpm typecheck` na svaki push, od srpnja 2026. zelen). Svejedno: netipizirani moduli trebaju shim u `apps/api/src/types/*.d.ts`, i nakon pusha provjeri da je API deploy READY. Vercel preskače API build kad se mijenja samo `apps/os` — ne oslanjaj se na to da je zadnji push deployan.
- **Quotanje git putanja**: Dashboard putanje imaju zagrade — uvijek quotaj: `git add "apps/os/src/app/(dashboard)/..."`.
