import { PrismaClient } from '@prisma/client';
import XLSX from 'xlsx';

const DATABASE_URL = process.env.DATABASE_URL;

const prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });

// Pre-computed bcrypt hash for temp password "Member2026!"
const PASSWORD_HASH = '$2a$10$S3y9eKetkN9X0iuCgcVvPebLOKROEaHIG8VH7glYc8DOYzPWEFCMm';

const MEMBERS_FILE = '/Users/nikolabudisa/Downloads/Popis članova - za Budišu.xlsx';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clean(val: unknown): string {
  if (val == null) return '';
  return String(val).trim();
}

function cleanEmail(val: unknown): string {
  const email = clean(val).toLowerCase();
  return email.replace(/\s/g, '');
}

function cleanPhone(val: unknown): string {
  let phone = clean(val);
  if (!phone) return '';
  phone = phone.replace(/\s+/g, '').replace(/^00/, '+');
  if (/^\d{9,}$/.test(phone) && !phone.startsWith('+')) {
    phone = '+385' + phone;
  }
  if (phone.startsWith('0') && !phone.startsWith('+')) {
    phone = '+385' + phone.slice(1);
  }
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
    // Excel serial date
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + val * 86400000);
    if (!isNaN(date.getTime())) return date;
  }
  const str = clean(val);
  if (!str) return null;
  const ddmmyyyy = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\.?$/);
  if (ddmmyyyy) {
    return new Date(+ddmmyyyy[3], +ddmmyyyy[2] - 1, +ddmmyyyy[1]);
  }
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

function memberNumber(prefix: string, index: number): string {
  return `${prefix}-${String(index).padStart(4, '0')}`;
}

// ─── Import Trgovci (Web Traders) — Sheet "Trgovci" ─────────────────────────

async function importTrgovci(sheet: XLSX.WorkSheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, unknown>[];
  console.log(`\nImporting Trgovci: ${rows.length} rows`);

  let created = 0, skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];

    const companyName = clean(r['Naziv tvrtke']);
    const companyOib = cleanOib(r['OIB tvrtke']);
    const companyEmail = cleanEmail(r['E-mail tvrtke']);
    const companyAddress = clean(r['Adresa tvrtke']);
    const website = clean(r['URL webshopa']);

    // Contact person 1
    const firstName = clean(r['Ime 1. član']);
    const lastName = clean(r['Prezime 1. član']);
    const contactEmail = cleanEmail(r['Email 1. član']);
    const contactPhone = cleanPhone(r['Mobitel 1. član']);

    const email = contactEmail || companyEmail;
    if (!email || !email.includes('@')) { skipped++; continue; }
    if (!companyName) { skipped++; continue; }

    const status = mapStatus(r['Status članstva']);
    const joinedAt = parseExcelDate(r['Prvo učlanjenje (datum pristupanja)']);
    const expiresAt = parseExcelDate(r['Istek članstva']);

    try {
      const user = await prisma.user.upsert({
        where: { email },
        update: { firstName: firstName || companyName.split(' ')[0], lastName: lastName || 'Član' },
        create: {
          email,
          passwordHash: PASSWORD_HASH,
          firstName: firstName || companyName.split(' ')[0],
          lastName: lastName || 'Član',
          role: 'MEMBER',
          isActive: status === 'ACTIVE',
        },
      });

      const oib = companyOib || `000${String(i).padStart(8, '0')}`;
      const company = await prisma.company.upsert({
        where: { oib },
        update: { name: companyName, website: website || undefined },
        create: {
          name: companyName,
          oib,
          address: companyAddress || 'N/A',
          city: 'Zagreb',
          zip: '10000',
          website: website || undefined,
          phone: contactPhone || undefined,
        },
      });

      const existing = await prisma.member.findUnique({ where: { userId: user.id } });
      if (!existing) {
        await prisma.member.create({
          data: {
            userId: user.id,
            companyId: company.id,
            memberType: 'WEB_TRADER',
            status,
            memberNumber: memberNumber('WT', i + 1),
            joinedAt,
            expiresAt,
          },
        });
      }

      created++;
      if (created % 50 === 0) console.log(`  Trgovci: ${created} imported...`);
    } catch (err) {
      console.error(`  Error row ${i}: ${email} — ${(err as Error).message}`);
      skipped++;
    }
  }

  console.log(`  Trgovci done: ${created} created, ${skipped} skipped`);
  return created;
}

// ─── Import Nuditelji (Service Providers) — Sheet "Nuditelji" ────────────────

async function importNuditelji(sheet: XLSX.WorkSheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, unknown>[];
  console.log(`\nImporting Nuditelji: ${rows.length} rows`);

  let created = 0, skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];

    const companyName = clean(r['cc']);
    const companyOib = cleanOib(r['OIB tvrtke']);
    const companyEmail = cleanEmail(r['Email tvrtke']);
    const companyAddress = clean(r['Adresa tvrtke']);
    const website = clean(r['URL webshopa']);

    // Contact person 1
    const firstName = clean(r['Ime 1. član']);
    const lastName = clean(r['Prezime 1. član']);
    const contactEmail = cleanEmail(r['Email 1. član']);
    const contactPhone = cleanPhone(r['Mobitel 1. član']);

    const email = contactEmail || companyEmail;
    if (!email || !email.includes('@')) { skipped++; continue; }
    if (!companyName) { skipped++; continue; }

    const status = mapStatus(r['Status članstva']);
    const joinedAt = parseExcelDate(r['Prvo učlanjenje (datum pristupanja)']);
    const expiresAt = parseExcelDate(r['Istek članstva']);

    try {
      const user = await prisma.user.upsert({
        where: { email },
        update: { firstName: firstName || companyName.split(' ')[0], lastName: lastName || 'Član' },
        create: {
          email,
          passwordHash: PASSWORD_HASH,
          firstName: firstName || companyName.split(' ')[0],
          lastName: lastName || 'Član',
          role: 'MEMBER',
          isActive: status === 'ACTIVE',
        },
      });

      const oib = companyOib || `100${String(i).padStart(8, '0')}`;
      const company = await prisma.company.upsert({
        where: { oib },
        update: { name: companyName, website: website || undefined },
        create: {
          name: companyName,
          oib,
          address: companyAddress || 'N/A',
          city: 'Zagreb',
          zip: '10000',
          website: website || undefined,
          phone: contactPhone || undefined,
        },
      });

      const existing = await prisma.member.findUnique({ where: { userId: user.id } });
      if (!existing) {
        await prisma.member.create({
          data: {
            userId: user.id,
            companyId: company.id,
            memberType: 'SERVICE_PROVIDER',
            status,
            memberNumber: memberNumber('SP', i + 1),
            joinedAt,
            expiresAt,
          },
        });
      }

      created++;
      if (created % 50 === 0) console.log(`  Nuditelji: ${created} imported...`);
    } catch (err) {
      console.error(`  Error row ${i}: ${email} — ${(err as Error).message}`);
      skipped++;
    }
  }

  console.log(`  Nuditelji done: ${created} created, ${skipped} skipped`);
  return created;
}

// ─── Import Fizički (Physical Members) — Sheet "Fizički" ────────────────────

async function importFizicki(sheet: XLSX.WorkSheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, unknown>[];
  console.log(`\nImporting Fizički: ${rows.length} rows`);

  let created = 0, skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];

    // Note: "Ime " has trailing space in Excel header
    const firstName = clean(r['Ime ']) || clean(r['Ime']);
    const lastName = clean(r['Prezime']);
    const email = cleanEmail(r['Email 1. član']);
    const phone = cleanPhone(r['Mobitel']);
    const oib = cleanOib(r['OIB']);
    const address = clean(r['Adresa']);

    if (!email || !email.includes('@')) { skipped++; continue; }
    if (!firstName) { skipped++; continue; }

    const status = mapStatus(r['Status članstva']);
    const joinedAt = parseExcelDate(r['Prvo učlanjenje (datum pristupanja)']);
    const expiresAt = parseExcelDate(r['Istek članstva']);

    try {
      const user = await prisma.user.upsert({
        where: { email },
        update: { firstName, lastName: lastName || 'Član' },
        create: {
          email,
          passwordHash: PASSWORD_HASH,
          firstName,
          lastName: lastName || 'Član',
          role: 'MEMBER',
          isActive: status === 'ACTIVE',
        },
      });

      // Physical members — create personal "company" record
      const personalOib = oib || `200${String(i).padStart(8, '0')}`;
      const company = await prisma.company.upsert({
        where: { oib: personalOib },
        update: {},
        create: {
          name: `${firstName} ${lastName || 'Član'}`.trim(),
          oib: personalOib,
          address: address || 'N/A',
          city: 'Zagreb',
          zip: '10000',
          phone: phone || undefined,
        },
      });

      const existing = await prisma.member.findUnique({ where: { userId: user.id } });
      if (!existing) {
        await prisma.member.create({
          data: {
            userId: user.id,
            companyId: company.id,
            memberType: 'PHYSICAL',
            status,
            memberNumber: memberNumber('PH', i + 1),
            joinedAt,
            expiresAt,
          },
        });
      }

      created++;
      if (created % 50 === 0) console.log(`  Fizički: ${created} imported...`);
    } catch (err) {
      console.error(`  Error row ${i}: ${email} — ${(err as Error).message}`);
      skipped++;
    }
  }

  console.log(`  Fizički done: ${created} created, ${skipped} skipped`);
  return created;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== eCommerce Hrvatska Member Import ===');
  console.log(`Database: ${DATABASE_URL.replace(/:[^:@]+@/, ':***@')}`);
  console.log(`File: ${MEMBERS_FILE}\n`);

  const workbook = XLSX.readFile(MEMBERS_FILE);
  console.log(`Sheets: ${workbook.SheetNames.join(', ')}`);

  await prisma.$connect();
  const userCount = await prisma.user.count();
  console.log(`Existing users in DB: ${userCount}`);

  let total = 0;

  // Sheet order: Nuditelji (0), Fizički (1), Trgovci (2)
  const nuditeljSheet = workbook.Sheets['Nuditelji'];
  if (nuditeljSheet) total += await importNuditelji(nuditeljSheet);

  const fizickiSheet = workbook.Sheets['Fizički'];
  if (fizickiSheet) total += await importFizicki(fizickiSheet);

  const trgovciSheet = workbook.Sheets['Trgovci'];
  if (trgovciSheet) total += await importTrgovci(trgovciSheet);

  // Final stats
  const finalUsers = await prisma.user.count();
  const finalMembers = await prisma.member.count();
  const finalCompanies = await prisma.company.count();

  console.log('\n=== Import Complete ===');
  console.log(`Total imported: ${total}`);
  console.log(`Users in DB: ${finalUsers}`);
  console.log(`Members in DB: ${finalMembers}`);
  console.log(`Companies in DB: ${finalCompanies}`);
}

main()
  .catch((e) => {
    console.error('Import failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
