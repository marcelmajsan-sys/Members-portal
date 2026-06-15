import { PrismaClient } from '@prisma/client';
import XLSX from 'xlsx';

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL },
  },
});

const FILE = '/Users/nikolabudisa/Downloads/Popis članova - aktualan.xlsx';

function clean(val: unknown): string {
  if (val == null) return '';
  return String(val).trim();
}

function cleanEmail(val: unknown): string {
  return clean(val).toLowerCase().replace(/\s/g, '');
}

async function main() {
  console.log('=== Import Certificate Data ===');

  const workbook = XLSX.readFile(FILE);
  await prisma.$connect();

  let updated = 0;
  let notFound = 0;
  let noData = 0;

  // Only Trgovci sheet has certificate data
  const sheetName = 'Trgovci';
  const sheet = workbook.Sheets[sheetName];
  if (sheet === undefined) {
    console.log('Sheet "Trgovci" not found');
    return;
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, unknown>[];
  console.log(`Sheet "${sheetName}": ${rows.length} rows`);

  for (const r of rows) {
    const certVal = clean(r['AKTIVAN CERTIFIKAT']).toUpperCase();
    const acadVal = clean(r['AKADEMIJA'] || r['AKADEMIJA ']).toUpperCase();
    const safeVal = clean(r['SAFE SHOP']);

    const hasCert = certVal === 'DA';
    const hasAcad = acadVal === 'DA';
    const safeStatus = safeVal.length > 0 ? safeVal : null;

    // Skip rows with no certificate data at all
    if (hasCert === false && hasAcad === false && safeStatus === null) {
      noData++;
      continue;
    }

    // Find member by email
    const contactEmail = cleanEmail(r['Email 1. član']);
    const companyEmail = cleanEmail(r['E-mail tvrtke']) || cleanEmail(r['Email tvrtke']);
    const email = contactEmail || companyEmail;

    if (email.length === 0 || email.indexOf('@') === -1) {
      continue;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { member: { select: { id: true } } },
    });

    if (user === null || user.member === null) {
      notFound++;
      continue;
    }

    await prisma.member.update({
      where: { id: user.member.id },
      data: {
        hasCertificate: hasCert,
        hasAcademy: hasAcad,
        safeShopStatus: safeStatus,
      },
    });

    updated++;
  }

  console.log(`\n=== Done ===`);
  console.log(`Updated: ${updated}`);
  console.log(`No cert data in row: ${noData}`);
  console.log(`Member not found: ${notFound}`);

  // Verify
  const withCert = await prisma.member.count({ where: { hasCertificate: true } });
  const withAcad = await prisma.member.count({ where: { hasAcademy: true } });
  const withSafe = await prisma.member.count({ where: { safeShopStatus: { not: null } } });
  console.log(`\nMembers with certificate: ${withCert}`);
  console.log(`Members with academy: ${withAcad}`);
  console.log(`Members with safe shop status: ${withSafe}`);
}

main()
  .catch((e) => {
    console.error('Failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
