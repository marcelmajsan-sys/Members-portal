import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// One-off: označi članove iz "akademija klijenti.csv" kao hasAcademy=true (Akademija završena)

const CSV_FILE = 'C:/Users/marce/Desktop/akademija klijenti.csv';

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

async function main() {
  console.log('=== Import Academy CSV ===');

  const raw = fs.readFileSync(CSV_FILE, 'utf8');
  const lines = raw.split(/\r?\n/).slice(1).filter((l) => l.trim().length > 0);

  const emails = new Set<string>();
  for (const line of lines) {
    // Email je 2. kolona; ID i Email nikad nisu quotani
    const m = line.match(/^\d+,([^,]+),/);
    if (m && m[1].includes('@')) emails.add(m[1].trim().toLowerCase());
  }
  console.log(`CSV rows: ${lines.length}, unique emails: ${emails.size}`);

  await prisma.$connect();

  const users = await prisma.user.findMany({
    where: { member: { isNot: null } },
    select: { email: true, member: { select: { id: true, hasAcademy: true } } },
  });

  const byEmail = new Map<string, { id: string; hasAcademy: boolean }>();
  for (const u of users) {
    if (u.member) byEmail.set(u.email.toLowerCase(), u.member);
  }

  let updated = 0;
  let alreadySet = 0;
  const notFound: string[] = [];

  for (const email of emails) {
    const member = byEmail.get(email);
    if (!member) {
      notFound.push(email);
      continue;
    }
    if (member.hasAcademy) {
      alreadySet++;
      continue;
    }
    await prisma.member.update({
      where: { id: member.id },
      data: { hasAcademy: true },
    });
    updated++;
  }

  console.log(`\n=== Done ===`);
  console.log(`Updated (hasAcademy -> true): ${updated}`);
  console.log(`Already had hasAcademy: ${alreadySet}`);
  console.log(`No member on portal (${notFound.length}):`);
  for (const e of notFound.sort()) console.log(`  ${e}`);

  const total = await prisma.member.count({ where: { hasAcademy: true } });
  console.log(`\nTotal members with hasAcademy=true: ${total}`);
}

main()
  .catch((e) => {
    console.error('Failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
