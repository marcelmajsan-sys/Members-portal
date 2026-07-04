# Specifikacija: Ulaznice za konferenciju (članski portal)

> **Kako koristiti:** pokreni Claude Code u rootu repozitorija s uputom:
> *"Implementiraj funkcionalnost ulaznica prema ULAZNICE-SPEC.md, poštujući CLAUDE.md konvencije."*
> Spec je prilagođen postojećem stacku: Express API (`apps/api`) + Next.js članski portal
> (`apps/portal`) + Prisma/Supabase (`packages/db`) + Resend (`packages/email`).

## 1. Cilj

Omogućiti članovima (rola `MEMBER`) da na **members.ecommerce.hr** sami dodaju i uređuju
**osobe za ulaznice** za konferenciju (CRO Commerce 2026), po uzoru na CRO Commerce
partner-portal: popis osoba s bedžom tipa (VIP/STANDARD), link "Ulaznica" s QR kodom,
gumb "+ Dodaj osobu za ulaznice".

## 2. Postojeće na što se naslanja

- `Conference` model već postoji u `packages/db/prisma/schema.prisma` (s `ConferenceSponsor`,
  `ConferenceSpeaker`) — ulaznice se vežu na njega, **ne raditi novi event-sustav**.
- Benefit "Ulaznica za CRO Commerce 2026" već postoji u katalogu pogodnosti — kvota ulaznica
  po članu izvodi se iz članstva/benefita (vidi 4.2), a postojeći benefit ostaje kao ulaz u flow.
- Portal dashboard: `apps/portal/src/app/page.tsx` — nova sekcija ide ispod "Pogodnosti".
- Member-scoped API: `apps/api/src/routes/member.routes.ts` (isti auth obrazac kao
  profile/perks).
- Admin API: `apps/api/src/routes/os.routes.ts` + admin stranica u
  `apps/os/src/app/(dashboard)/`.
- Email: `packages/email/src/send.ts` (`sendEmail()`, automatski loggira u `EmailLog`).
- QR generiranje: `bwip-js` se već koristi u API-ju (postoji type-shim u `apps/api/src/types/`).

## 3. Prisma model (novo)

```prisma
enum TicketType {
  VIP
  STANDARD
}

enum TicketStatus {
  CONFIRMED   // unutar kvote ili odobreno od admina
  PENDING     // preko kvote — čeka ponudu/odobrenje
  CANCELLED
}

model ConferenceTicket {
  id           String       @id @default(cuid())
  conferenceId String
  memberId     String       // vlasnik — član koji je osobu dodao
  fullName     String
  jobTitle     String?
  email        String
  phone        String
  type         TicketType   @default(STANDARD)
  status       TicketStatus @default(CONFIRMED)
  token        String       @unique @default(cuid()) // za javni QR URL
  checkedInAt  DateTime?
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  conference Conference @relation(fields: [conferenceId], references: [id])
  member     Member     @relation(fields: [memberId], references: [id])

  @@unique([conferenceId, email])
}
```

Na `Conference` dodati (aditivno):

```prisma
  editDeadline    DateTime?  // rok za izmjene osoba (npr. 10.10.2026.)
  extraDiscount   Int        @default(30) // % popusta za ulaznice preko kvote
  ticketQuotas    Json?      // { "STANDARD": { "Standard": 1, "Premium": 2 }, "VIP": {...} } po MemberType/Tier
  tickets         ConferenceTicket[]
```

> **KRITIČNO:** nakon `prisma db push` s novom tablicom ponovno pokrenuti
> `packages/db/prisma/sql/rls-lockdown.sql` (vidi CLAUDE.md).

## 4. API rute

### 4.1. Member-scoped (`member.routes.ts`, auth: MEMBER)

```
GET    /api/member/conferences/active            # aktivna konferencija + kvota + rok
GET    /api/member/conferences/:id/tickets       # samo vlastite (memberId iz tokena!)
POST   /api/member/conferences/:id/tickets       # dodaj osobu
PUT    /api/member/conferences/:id/tickets/:tid  # uredi
DELETE /api/member/conferences/:id/tickets/:tid  # ukloni
```

Backend validacije (ne samo UI):
- vlasništvo (`memberId` iz JWT-a, nikad iz bodyja),
- rok: nakon `editDeadline` POST/PUT/DELETE vraćaju 403 s porukom,
- duplikat emaila unutar konferencije → 409 s jasnom hrvatskom porukom,
- kvota: unutar kvote → `CONFIRMED`; preko kvote → `PENDING` + `await notifyStaff(...)`
  ("Zatražena dodatna ulaznica") — **await prije successResponse** (serverless, vidi CLAUDE.md).

### 4.2. Kvota

Kvota po članu = vrijednost iz `Conference.ticketQuotas` prema `Member.type`/`tier`
(+ mogući admin override po članu, npr. polje `ticketQuotaOverride Json?` na Member — samo ako
zatreba). Default ako nije definirano: 1 STANDARD ulaznica za ACTIVE članove.

### 4.3. Javna ulaznica + check-in

```
GET  /api/tickets/:token          # javni JSON/HTML: ime, tvrtka, tip, QR (bwip-js) — bez autha, rate-limited
POST /api/os/tickets/:token/checkin   # auth: OWNER/OPERATOR; postavi checkedInAt; već skenirano → 409 s vremenom
```

Na portalu link "Ulaznica" otvara `apps/portal` stranicu `/ulaznica/[token]` (javna, bez
prijave) koja renderira podatke + QR (QR sadrži token / checkin URL).

### 4.4. Admin (`os.routes.ts`, auth: OWNER/OPERATOR)

```
GET  /api/os/conferences/:id/tickets            # sve prijave, filteri (status, tip, član), comma-separated query
PUT  /api/os/conferences/:id/tickets/:tid       # promjena statusa (PENDING → CONFIRMED), tipa itd.
GET  /api/os/conferences/:id/tickets/export     # CSV export (ime, tvrtka, email, tip, status, check-in)
```

## 5. UI

### 5.1. Članski portal (`apps/portal/src/app/page.tsx`)

Nova kartica **"Osobe za ulaznice"** (vidljiva samo dok postoji aktivna konferencija;
akcije samo ACTIVE članovima):

- Uvodni tekst: *"Možete dodavati i mijenjati osobe za ulaznice najkasnije do {editDeadline}.
  Ako dodate više osoba nego što imate u paketu, poslat ćemo vam ponudu za dodatne ulaznice
  uz {extraDiscount}% popusta."*
- Po osobi: ime i prezime (bold) + funkcija (sivo), bedž tipa (`VIP` žuti, `STANDARD` sivi,
  `NA ČEKANJU` narančasti), email, telefon, link **"Ulaznica"** (QR ikona, otvara
  `/ulaznica/[token]` u novom tabu; za PENDING umjesto linka tekst "Čeka potvrdu"),
  akcije Uredi/Ukloni.
- Gumb **"+ Dodaj osobu za ulaznice"** → modal/forma: ime i prezime*, funkcija, email*,
  telefon*, tip (select, prikaži preostalu kvotu).
- Nakon roka: akcije skrivene/disabled + poruka da je rok prošao; pregled i QR ostaju.
- Stil: postojeći Tailwind v4 obrasci s dashboarda, hrvatski jezik.

### 5.2. Admin (`apps/os/src/app/(dashboard)/conferences/...` ili postojeća struktura)

- Tab/stranica "Ulaznice" po konferenciji: tablica svih prijava, filteri (Set<string> obrazac),
  akcija odobri (PENDING → CONFIRMED), CSV export, live brojka check-ina.
- Postavke konferencije: `editDeadline`, `extraDiscount`, `ticketQuotas`.

## 6. Emailovi (Resend, `sendEmail()`)

1. **Osobi za ulaznicu** (kad postane CONFIRMED): potvrda + link na `/ulaznica/[token]`.
2. **Članu**: potvrda dodane osobe / obavijest da je dodatna ulaznica na čekanju.
3. **Osoblju**: `notifyStaff` kad član premaši kvotu (za slanje ponude s popustom).

## 7. Kriteriji prihvaćanja

- [ ] Član vidi sekciju s kvotom, popisom svojih osoba i može dodati/urediti/ukloniti do roka.
- [ ] Nakon `editDeadline` mutacije su blokirane i na backendu (403), UI to jasno kaže.
- [ ] Duplikat emaila unutar konferencije odbijen (409, hrvatska poruka).
- [ ] Osoba preko kvote = PENDING, bez aktivnog QR-a; admin je može potvrditi.
- [ ] `/ulaznica/[token]` radi bez prijave i prikazuje QR; check-in je jednokratan
      (drugi sken → upozorenje s vremenom prvog).
- [ ] Admin ima pregled, filtere, potvrdu PENDING prijava i CSV export.
- [ ] Emailovi se šalju kroz `sendEmail()` (loggirani u EmailLog).
- [ ] `rls-lockdown.sql` ponovno pokrenut nakon nove tablice.
- [ ] `cd apps/api && npx tsc --noEmit` prolazi prije pusha; API deploy READY.

## 8. Redoslijed implementacije (prijedlog)

1. Prisma: `ConferenceTicket` + polja na `Conference` → `db push` → RLS lockdown.
2. Member API rute + validacije (kvota, rok, duplikat, vlasništvo).
3. Javna ruta ulaznice + QR (bwip-js) + portal stranica `/ulaznica/[token]`.
4. Portal sekcija "Osobe za ulaznice" (popis + forma).
5. Admin rute + admin UI (pregled, potvrda, export, postavke).
6. Emailovi + notifyStaff.
7. Provjera: tsc, ručni test flow-a, push (auto-deploy sva tri Vercel projekta).
