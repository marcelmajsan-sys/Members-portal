import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// One-off (izvršeno 17.07.2026.): upiši Safe Shop pristupne podatke (email + nova lozinka)
// iz reset CSV-a svim članovima koji postoje i u CSV-u i na portalu
// (Member.safeShopEmail / safeShopPassword — prikazuju se adminu na profilu člana
// i članu na portalu). Uparivanje: email člana → email tvrtke → domena web trgovine.

const CSV_FILE = 'C:/Users/marce/Desktop/reset_users_2026-07-13_10-33-40.csv';
const DRY_RUN = process.argv.includes('--dry-run');

// Generičke email domene — ne koriste se za uparivanje po domeni web trgovine
const GENERIC_DOMAINS = new Set(['gmail.com', 'ptiong.com', 'yahoo.com', 'hotmail.com', 'outlook.com']);

function emailDomain(email: string): string | null {
  const d = email.split('@')[1]?.toLowerCase().replace(/^www\./, '');
  return d && !GENERIC_DOMAINS.has(d) ? d : null;
}

function websiteDomain(website: string | null | undefined): string | null {
  if (!website) return null;
  return website
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split(/[/?#]/)[0]
    .trim() || null;
}

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
  console.log('=== Import Safe Shop passwords ===');

  const raw = fs.readFileSync(CSV_FILE, 'utf8');
  const lines = raw.split(/\r?\n/).slice(1).filter((l) => l.trim().length > 0);

  // Format: ID,Korisničko ime,E-mail,Nova Lozinka — lozinka je zadnja kolona,
  // email predzadnja (korisničko ime može teoretski sadržavati zarez).
  const rows: { email: string; password: string }[] = [];
  for (const line of lines) {
    const parts = line.split(',');
    if (parts.length < 4) continue;
    const email = parts[parts.length - 2].trim().toLowerCase();
    const password = parts[parts.length - 1].trim();
    if (!email.includes('@') || !password) continue;
    rows.push({ email, password });
  }
  console.log(`CSV rows: ${lines.length}, valid rows: ${rows.length}`);

  await prisma.$connect();

  const members = await prisma.member.findMany({
    select: {
      id: true,
      user: { select: { email: true } },
      company: { select: { name: true, email: true, website: true } },
    },
  });

  const byUserEmail = new Map<string, string>();
  const byCompanyEmail = new Map<string, string[]>();
  const byDomain = new Map<string, string[]>(); // domena web trgovine ILI domena emailova člana
  const label = new Map<string, string>(); // memberId -> opis za ispis
  for (const m of members) {
    byUserEmail.set(m.user.email.toLowerCase(), m.id);
    label.set(m.id, `${m.company.name} <${m.user.email}>`);
    const ce = m.company.email?.toLowerCase();
    if (ce) byCompanyEmail.set(ce, [...(byCompanyEmail.get(ce) || []), m.id]);
    const domains = new Set(
      [websiteDomain(m.company.website), emailDomain(m.user.email), ce ? emailDomain(ce) : null].filter(
        (d): d is string => !!d,
      ),
    );
    for (const d of domains) byDomain.set(d, [...(byDomain.get(d) || []), m.id]);
  }

  let updated = 0;
  const viaDomain: string[] = [];
  const notFound: string[] = [];
  const ambiguous: string[] = [];

  for (const row of rows) {
    let memberId = byUserEmail.get(row.email);
    if (!memberId) {
      const viaCompany = byCompanyEmail.get(row.email) || [];
      if (viaCompany.length === 1) memberId = viaCompany[0];
      else if (viaCompany.length > 1) {
        ambiguous.push(`${row.email} (email tvrtke kod više članova)`);
        continue;
      }
    }
    if (!memberId) {
      // Fallback: domena CSV emaila == domena web trgovine / emaila člana (samo jednoznačno)
      const d = emailDomain(row.email);
      const candidates = d ? [...new Set(byDomain.get(d) || [])] : [];
      if (candidates.length === 1) {
        memberId = candidates[0];
        viaDomain.push(`${row.email} -> ${label.get(memberId)}`);
      } else if (candidates.length > 1) {
        ambiguous.push(`${row.email} (domena kod više članova)`);
        continue;
      }
    }
    if (!memberId) {
      notFound.push(row.email);
      continue;
    }
    if (!DRY_RUN) {
      await prisma.member.update({
        where: { id: memberId },
        data: { safeShopEmail: row.email, safeShopPassword: row.password },
      });
    }
    updated++;
  }

  console.log(`\n=== ${DRY_RUN ? 'DRY RUN — ništa nije upisano' : 'Done'} ===`);
  console.log(`Updated members: ${updated}`);
  console.log(`Matched via domain (${viaDomain.length}):`);
  for (const e of viaDomain.sort()) console.log(`  ${e}`);
  if (ambiguous.length) {
    console.log(`Ambiguous (skipped, ${ambiguous.length}):`);
    for (const e of ambiguous.sort()) console.log(`  ${e}`);
  }
  console.log(`No member on portal (${notFound.length}):`);
  for (const e of notFound.sort()) console.log(`  ${e}`);
}

main()
  .catch((e) => {
    console.error('Failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
