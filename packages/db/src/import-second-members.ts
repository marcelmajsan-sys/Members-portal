import { PrismaClient } from '@prisma/client';
import XLSX from 'xlsx';

const DATABASE_URL = process.env.DATABASE_URL;

const prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });

const PASSWORD_HASH = '$2a$10$S3y9eKetkN9X0iuCgcVvPebLOKROEaHIG8VH7glYc8DOYzPWEFCMm';

const MEMBERS_FILE = '/Users/nikolabudisa/ecommerce-hr-os/Popis članova - aktualan (1).xlsx';

function clean(val: unknown): string {
  if (val == null) return '';
  return String(val).trim();
}

function cleanEmail(val: unknown): string {
  return clean(val).toLowerCase().replace(/\s/g, '');
}

function cleanPhone(val: unknown): string {
  let phone = clean(val);
  if (!phone) return '';
  phone = phone.replace(/\s+/g, '').replace(/^00/, '+');
  if (/^\d{9,}$/.test(phone) && !phone.startsWith('+')) phone = '+385' + phone;
  if (phone.startsWith('0') && !phone.startsWith('+')) phone = '+385' + phone.slice(1);
  return phone;
}

function cleanOib(val: unknown): string {
  const oib = clean(val).replace(/\D/g, '');
  return oib.length === 11 ? oib : '';
}

function parseExcelDate(val: unknown): Date | null {
  if (val == null || val === '') return null;
  if (val instanceof Date) return val;
  if (typeof val === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + val * 86400000);
    if (!isNaN(date.getTime())) return date;
  }
  const str = clean(val);
  if (!str) return null;
  const ddmmyyyy = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\.?$/);
  if (ddmmyyyy) return new Date(+ddmmyyyy[3], +ddmmyyyy[2] - 1, +ddmmyyyy[1]);
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

type MemberStatus = 'ACTIVE' | 'EXPIRED' | 'PENDING' | 'SUSPENDED';

function mapStatus(val: unknown): MemberStatus {
  const s = clean(val).toUpperCase();
  if (s.includes('AKTIV') && !s.includes('NEAKTIV')) return 'ACTIVE';
  if (s.includes('NEAKTIV')) return 'EXPIRED';
  return 'PENDING';
}

// ─── Import 2nd members for Trgovci ──────────────────────────────────────────

async function importTrgovci2nd(sheet: XLSX.WorkSheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, unknown>[];
  console.log(`\nTrgovci — scanning ${rows.length} rows for 2nd members`);

  let created = 0, skipped = 0, noData = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];

    const ime2 = clean(r['Ime 2. član']);
    const prezime2 = clean(r['Prezime 2. član']);
    const email2 = cleanEmail(r['Email 2. član']);

    if (!ime2 && !email2) { noData++; continue; }
    if (!email2 || !email2.includes('@')) {
      console.log(`  Skip row ${i}: ${clean(r['Naziv tvrtke'])} — 2nd member has no valid email`);
      skipped++;
      continue;
    }

    // Find the company by OIB (same logic as original import)
    const companyOib = cleanOib(r['OIB tvrtke']);
    const oibKey = companyOib || `000${String(i).padStart(8, '0')}`;

    const company = await prisma.company.findUnique({ where: { oib: oibKey } });
    if (!company) {
      console.log(`  Skip row ${i}: company OIB ${oibKey} not found in DB (${clean(r['Naziv tvrtke'])})`);
      skipped++;
      continue;
    }

    const status = mapStatus(r['Status članstva']);
    const joinedAt = parseExcelDate(r['Prvo učlanjenje (datum pristupanja)']);
    const expiresAt = parseExcelDate(r['Istek članstva']);
    const phone2 = cleanPhone(r['Mobitel 2. član']);

    try {
      // Check if this email already exists as a user
      const existingUser = await prisma.user.findUnique({ where: { email: email2 } });
      if (existingUser) {
        const existingMember = await prisma.member.findUnique({ where: { userId: existingUser.id } });
        if (existingMember) {
          console.log(`  Already exists: ${email2} (member of ${company.name})`);
          skipped++;
          continue;
        }
      }

      const user = await prisma.user.upsert({
        where: { email: email2 },
        update: { firstName: ime2, lastName: prezime2 || 'Član' },
        create: {
          email: email2,
          passwordHash: PASSWORD_HASH,
          firstName: ime2,
          lastName: prezime2 || 'Član',
          role: 'MEMBER',
          isActive: status === 'ACTIVE',
        },
      });

      // Get next member number
      const lastMember = await prisma.member.findFirst({
        where: { memberNumber: { startsWith: 'WT-' } },
        orderBy: { memberNumber: 'desc' },
      });
      const nextNum = lastMember ? parseInt(lastMember.memberNumber.split('-')[1]) + 1 : 900;

      await prisma.member.create({
        data: {
          userId: user.id,
          companyId: company.id,
          memberType: 'WEB_TRADER',
          status,
          memberNumber: `WT-${String(nextNum).padStart(4, '0')}`,
          joinedAt,
          expiresAt,
        },
      });

      created++;
      console.log(`  ✓ ${ime2} ${prezime2} (${email2}) → ${company.name}`);
    } catch (err) {
      console.error(`  Error row ${i}: ${email2} — ${(err as Error).message}`);
      skipped++;
    }
  }

  console.log(`  Trgovci 2nd done: ${created} created, ${skipped} skipped, ${noData} no 2nd member`);
  return created;
}

// ─── Import 2nd members for Nuditelji ────────────────────────────────────────

async function importNuditelji2nd(sheet: XLSX.WorkSheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, unknown>[];
  console.log(`\nNuditelji — scanning ${rows.length} rows for 2nd members`);

  let created = 0, skipped = 0, noData = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];

    const ime2 = clean(r['Ime 2. član']);
    const prezime2 = clean(r['Prezime 2. član']);
    const email2 = cleanEmail(r['Email 2. član']);

    if (!ime2 && !email2) { noData++; continue; }
    if (!email2 || !email2.includes('@')) {
      console.log(`  Skip row ${i}: ${clean(r['cc'])} — 2nd member has no valid email`);
      skipped++;
      continue;
    }

    const companyOib = cleanOib(r['OIB tvrtke']);
    const oibKey = companyOib || `100${String(i).padStart(8, '0')}`;

    const company = await prisma.company.findUnique({ where: { oib: oibKey } });
    if (!company) {
      console.log(`  Skip row ${i}: company OIB ${oibKey} not found in DB (${clean(r['cc'])})`);
      skipped++;
      continue;
    }

    const status = mapStatus(r['Status članstva']);
    const joinedAt = parseExcelDate(r['Prvo učlanjenje (datum pristupanja)']);
    const expiresAt = parseExcelDate(r['Istek članstva']);
    const phone2 = cleanPhone(r['Mobitel 2. član']);

    try {
      const existingUser = await prisma.user.findUnique({ where: { email: email2 } });
      if (existingUser) {
        const existingMember = await prisma.member.findUnique({ where: { userId: existingUser.id } });
        if (existingMember) {
          console.log(`  Already exists: ${email2} (member of ${company.name})`);
          skipped++;
          continue;
        }
      }

      const user = await prisma.user.upsert({
        where: { email: email2 },
        update: { firstName: ime2, lastName: prezime2 || 'Član' },
        create: {
          email: email2,
          passwordHash: PASSWORD_HASH,
          firstName: ime2,
          lastName: prezime2 || 'Član',
          role: 'MEMBER',
          isActive: status === 'ACTIVE',
        },
      });

      const lastMember = await prisma.member.findFirst({
        where: { memberNumber: { startsWith: 'SP-' } },
        orderBy: { memberNumber: 'desc' },
      });
      const nextNum = lastMember ? parseInt(lastMember.memberNumber.split('-')[1]) + 1 : 900;

      await prisma.member.create({
        data: {
          userId: user.id,
          companyId: company.id,
          memberType: 'SERVICE_PROVIDER',
          status,
          memberNumber: `SP-${String(nextNum).padStart(4, '0')}`,
          joinedAt,
          expiresAt,
        },
      });

      created++;
      console.log(`  ✓ ${ime2} ${prezime2} (${email2}) → ${company.name}`);
    } catch (err) {
      console.error(`  Error row ${i}: ${email2} — ${(err as Error).message}`);
      skipped++;
    }
  }

  console.log(`  Nuditelji 2nd done: ${created} created, ${skipped} skipped, ${noData} no 2nd member`);
  return created;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Import 2nd Members ===');
  console.log(`Database: ${DATABASE_URL.replace(/:[^:@]+@/, ':***@')}`);

  const workbook = XLSX.readFile(MEMBERS_FILE);
  await prisma.$connect();

  const beforeMembers = await prisma.member.count();
  console.log(`Members before: ${beforeMembers}`);

  let total = 0;

  const trgovciSheet = workbook.Sheets['Trgovci'];
  if (trgovciSheet) total += await importTrgovci2nd(trgovciSheet);

  const nuditeljSheet = workbook.Sheets['Nuditelji'];
  if (nuditeljSheet) total += await importNuditelji2nd(nuditeljSheet);

  const afterMembers = await prisma.member.count();
  console.log(`\n=== Done ===`);
  console.log(`New members created: ${total}`);
  console.log(`Members before: ${beforeMembers} → after: ${afterMembers}`);
}

main()
  .catch((e) => { console.error('Import failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
