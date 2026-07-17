import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// One-off: kreiraj Premium benefite (uvjet PREMIUM_ONLY — prikazuju se samo
// Premium članovima ciljanog tipa, automatski i za buduće Premium članove):
//  - Web trgovci (PREMIUM): eCommerce Akademija
//  - Nuditelji usluga (PREMIUM): PR objava na webu udruge (3 kom)
// Idempotentno: postojeći benefit (po naslovu) se ažurira umjesto dupliciranja.

function loadDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envFile = path.resolve(process.cwd(), '../../apps/api/.env.production.pull');
  const content = fs.readFileSync(envFile, 'utf8');
  const match = content.match(/^DATABASE_URL="?([^"\r\n]+)"?/m);
  if (!match) throw new Error('DATABASE_URL not found in .env.production.pull');
  return match[1];
}

const prisma = new PrismaClient({
  datasources: { db: { url: loadDatabaseUrl() } },
});

const BENEFITS = [
  {
    title: 'eCommerce Akademija',
    description: 'Uključeno u vaše Premium članstvo.',
    memberTypes: ['WEB_TRADER' as const],
    quota: null as number | null,
  },
  {
    title: 'PR objava na webu udruge (3 kom)',
    description: 'Uključeno u vaše Premium članstvo.',
    memberTypes: ['SERVICE_PROVIDER' as const],
    quota: 3 as number | null,
  },
];

async function main() {
  console.log('=== Seed Premium benefits ===');
  for (const b of BENEFITS) {
    const existing = await prisma.benefit.findFirst({ where: { title: b.title } });
    const data = {
      title: b.title,
      description: b.description,
      memberTypes: b.memberTypes,
      condition: 'PREMIUM_ONLY',
      quota: b.quota,
      isActive: true,
    };
    if (existing) {
      await prisma.benefit.update({ where: { id: existing.id }, data });
      console.log(`Updated: ${b.title} (${existing.id})`);
    } else {
      const created = await prisma.benefit.create({ data });
      console.log(`Created: ${b.title} (${created.id})`);
    }
  }

  // Kontrola: koliko Premium članova vidi svaki benefit
  const [traders, providers] = await Promise.all([
    prisma.member.count({ where: { memberTier: 'PREMIUM', memberType: 'WEB_TRADER' } }),
    prisma.member.count({ where: { memberTier: 'PREMIUM', memberType: 'SERVICE_PROVIDER' } }),
  ]);
  console.log(`\nPremium web trgovci (eCommerce Akademija): ${traders}`);
  console.log(`Premium nuditelji (PR objava 3 kom): ${providers}`);
}

main()
  .catch((e) => {
    console.error('Failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
