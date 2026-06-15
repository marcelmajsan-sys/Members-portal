# CLAUDE.md

Interni OS za eCommerce Hrvatska. pnpm monorepo: Express API (Lambda), Next.js admin panel (Vercel), Prisma + PostgreSQL.

## Ključne putanje

```
apps/api/src/routes/os.routes.ts    — glavni admin API (~1000 linija)
apps/api/src/routes/index.ts        — registracija svih ruta
apps/api/src/app.ts                 — Express setup, email logger
apps/api/src/lambda.ts              — Lambda handler (serverless-express)
apps/os/src/app/(dashboard)/        — sve admin stranice (Next.js App Router)
packages/db/prisma/schema.prisma    — Prisma schema (svi modeli)
packages/email/src/send.ts          — sendEmail() s SES + tracking pixel
packages/ai/src/                    — Claude AI integracija
```

## AWS konfiguracija

- **Lambda**: `ecommerce-hr-api`, eu-central-1, handler `index.handler`
- **RDS**: `ecommerce-hr-db.cxkqg0ssqk9s.eu-central-1.rds.amazonaws.com:5432/ecommerce_hr`
- **SES**: eu-central-1, FROM `noreply@ecommerce.hr`
- **S3**: `ecommerce-hr-lambda-deploy` bucket za deploy zip

### Lambda deploy sekvenca

```bash
pnpm --filter db exec prisma generate
pnpm --filter api bundle
cp apps/api/dist/lambda.mjs lambda-package/index.mjs
cp -r packages/db/node_modules/.prisma lambda-package/node_modules/.prisma  # OBAVEZNO nakon schema promjena
cd lambda-package && zip -q -r ../lambda-deploy.zip .
aws s3 cp ../lambda-deploy.zip s3://ecommerce-hr-lambda-deploy/lambda-deploy.zip
aws lambda update-function-code --function-name ecommerce-hr-api --s3-bucket ecommerce-hr-lambda-deploy --s3-key lambda-deploy.zip
```

**KRITIČNO**: Nakon svake promjene Prisma sheme, MORAŠ kopirati svježi `.prisma` folder u `lambda-package/node_modules/.prisma`. Inače Lambda koristi stari Prisma klijent i create/update s novim poljima tiho pada.

## Konvencije

- **Zlatno pravilo**: Sve promjene su aditivne. Ništa postojeće se ne smije pokvariti.
- **Prisma**: Koristimo `prisma db push` za produkciju (ne migrate). Shema je source of truth.
- **Frontend**: Tailwind CSS v4 (`@import "tailwindcss"` + `@theme` blok, nema tailwind.config.ts)
- **Filteri**: Frontend koristi `Set<string>` za active filtere, backend prima comma-separated query parametre
- **Email logger**: Svaki `sendEmail()` automatski logira u EmailLog tablicu (s body od danas)
- **Commit poruke**: Na engleskom, kratke, opisne
- **Jezik UI-a**: Hrvatski
- **Deployment**: Lambda ručno (bundle+zip+S3), Vercel auto na git push
- **Quotanje git putanja**: Dashboard putanje imaju zagrade — uvijek quotaj: `git add "apps/os/src/app/(dashboard)/..."`
