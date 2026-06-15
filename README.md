# eCommerce HR OS

Interni operativni sustav za **eCommerce Hrvatska** — udrugu za e-trgovinu u Hrvatskoj. Monorepo s admin panelom, javnim webom, članskim portalom, mobilnom aplikacijom i AI savjetnikom.

## Tech Stack

| Sloj | Tehnologija |
|------|-------------|
| Monorepo | pnpm workspaces + Turborepo |
| Backend | Express 5, Node.js 20+, TypeScript |
| Frontend | Next.js 15, React 19, Tailwind CSS v4 |
| Mobile | Expo 54, React Native 0.81 |
| Baza | PostgreSQL 16 (Prisma ORM) |
| Queue | BullMQ + Redis 7 |
| Email | React Email + AWS SES |
| AI | Anthropic Claude SDK |
| Auth | JWT + refresh tokeni, bcrypt |

## Arhitektura (AWS)

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Vercel CDN │     │  API Gateway +   │     │  Amazon RDS │
│  (Next.js)  │────▶│  Lambda (Express)│────▶│ PostgreSQL  │
│  os/web/    │     │  eu-central-1    │     │  eu-central-1│
│  member     │     └──────────────────┘     └─────────────┘
└─────────────┘              │
                             ├──▶ Amazon SES (email s tracking pixelom)
                             ├──▶ Amazon S3 (Lambda deploy, assets)
                             └──▶ Redis (BullMQ job queue)
```

| Servis | Namjena |
|--------|---------|
| **Lambda** | Express API wrappan u serverless-express, esbuild bundle |
| **RDS** | PostgreSQL 16 — `ecommerce_hr` baza |
| **SES** | Transakcijski emailovi s open/click trackingom |
| **S3** | Lambda deploy zip, PDF ponude |
| **API Gateway** | HTTPS endpoint za Lambda |

## Struktura monorepa

```
apps/
  api/          Express backend (port 3001) — Lambda deploy
  os/           Admin dashboard (port 3003) — Vercel
  web/          Javni web (port 3000) — Vercel
  member/       Članski portal (port 3004) — Vercel
  mobile/       Expo/React Native mobilna app
  worker/       BullMQ background jobs

packages/
  db/           Prisma schema, migracije, seed
  email/        SES email servis + React Email predlošci
  shared/       Zod sheme, tipovi, utils
  ai/           Claude AI integracija
```

## Lokalni razvoj

```bash
# 1. Instaliraj dependencies
pnpm install

# 2. Pokreni PostgreSQL + Redis
docker compose -f infrastructure/docker/docker-compose.yml up -d

# 3. Kreiraj .env iz primjera
cp .env.example .env

# 4. Migracija i seed
pnpm db:migrate
pnpm db:seed

# 5. Pokreni sve appove
pnpm dev
```

**Portovi:**
- `localhost:3000` — web (javni site)
- `localhost:3001` — api (backend)
- `localhost:3003` — os (admin panel)
- `localhost:3004` — member (članski portal)
- `localhost:5432` — PostgreSQL
- `localhost:6379` — Redis

**Env varijable:**
```
DATABASE_URL=postgresql://dev:dev@localhost:5432/ecommerce_hr
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret
JWT_REFRESH_SECRET=dev-refresh-secret
AWS_REGION=eu-central-1
ANTHROPIC_API_KEY=sk-ant-...  # za AI značajke
```

## Deployment

### Frontend (Vercel)
Auto-deploy na `git push` u `main`. Svaki app ima svoj `vercel.json`.

### Backend (Lambda)
```bash
# 1. Regeneriraj Prisma klijent
pnpm --filter db exec prisma generate

# 2. Bundle
pnpm --filter api bundle

# 3. Kopiraj u lambda-package
cp apps/api/dist/lambda.mjs lambda-package/index.mjs
cp -r packages/db/node_modules/.prisma lambda-package/node_modules/.prisma

# 4. Zip i upload
cd lambda-package && zip -q -r ../lambda-deploy.zip .
aws s3 cp lambda-deploy.zip s3://ecommerce-hr-lambda-deploy/lambda-deploy.zip
aws lambda update-function-code \
  --function-name ecommerce-hr-api \
  --s3-bucket ecommerce-hr-lambda-deploy \
  --s3-key lambda-deploy.zip
```

### Baza (produkcija)
```bash
DATABASE_URL="postgresql://..." pnpm --filter db exec prisma db push
```

## Admin Panel (OS)

Značajke admin panela na `admin.ecommerce.hr`:

- **Dashboard** — pregled članova, isteka, plaćanja
- **Članovi** — lista s multi-select filterima (status, tip, certifikat, razina), pretraživanje, detalji profila
- **Ponude/Predračuni** — generiranje PDF predračuna, 1. i 2. obavijest s prilogom
- **Automatizacija** — sekvence s event triggerima, email šablone, cooldown
- **Kalendar** — eventi koji mogu triggerirati automatizaciju
- **Tim** — upravljanje zaposlenicima (role, lozinke, aktivacija)
- **Email predlošci** — WYSIWYG editor za email template
- **Zadaci** — task management s prioritetima i assignmentom
- **AI Sažetak** — Claude generira sažetak člana na profilu

## AI Savjetnik

Integriran Claude (Anthropic SDK) za:
- **AI Sažetak člana** — automatski generira pregled člana na osnovu podataka, plaćanja, emailova
- Planirano: email generiranje, churn predikcija, NL asistent

## Linkovi

| Resurs | URL |
|--------|-----|
| Admin panel | https://admin.ecommerce.hr |
| Javni web | https://ecommerce.hr |
| API | https://api.ecommerce.hr |
| Članski portal | https://member.ecommerce.hr |
| GitHub | https://github.com/nikola-dotcom/ecommerce-hr-os |

## Status / TODO

- [x] Core admin panel (članovi, plaćanja, ponude)
- [x] Automatizacija s event triggerima
- [x] Email tracking (open/click)
- [x] Email preview u povijesti
- [x] PDF predračuni s HUB-3 barkodom
- [x] AI sažetak člana
- [x] Responsive/mobilni admin panel
- [ ] Javni web redesign (Next.js)
- [ ] Članski portal
- [ ] AI email generiranje
- [ ] Churn predikcija
- [ ] Mobilna aplikacija
