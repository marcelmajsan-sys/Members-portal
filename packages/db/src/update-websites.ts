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
  console.log('=== Update Company Websites ===');

  const workbook = XLSX.readFile(FILE);
  await prisma.$connect();

  let updated = 0;
  let notFound = 0;
  let noUrl = 0;
  let alreadySet = 0;
  let noEmail = 0;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, unknown>[];
    console.log(`\nSheet "${sheetName}": ${rows.length} rows`);

    for (const r of rows) {
      // Get URL — clean quotes, trim
      let website = clean(r['URL webshopa']);
      website = website.replace(/^["']|["']$/g, '').trim();
      if (website.length === 0 || website.indexOf('.') === -1) { noUrl++; continue; }

      // Try multiple email columns
      const contactEmail = cleanEmail(r['Email 1. član']);
      const companyEmail = cleanEmail(r['Email tvrtke']) || cleanEmail(r['E-mail tvrtke']);
      const email = contactEmail || companyEmail;

      if (email.length === 0 || email.indexOf('@') === -1) { noEmail++; continue; }

      const user = await prisma.user.findUnique({
        where: { email },
        select: { member: { select: { companyId: true, company: { select: { website: true } } } } },
      });

      if (user === null || user.member === null) {
        notFound++;
        continue;
      }

      if (user.member.company.website === website) { alreadySet++; continue; }

      await prisma.company.update({
        where: { id: user.member.companyId },
        data: { website },
      });

      updated++;
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Already set: ${alreadySet}`);
  console.log(`No URL in Excel: ${noUrl}`);
  console.log(`No email in row: ${noEmail}`);
  console.log(`Member not found: ${notFound}`);

  // Verify
  const withWebsite = await prisma.company.count({ where: { website: { not: null } } });
  console.log(`\nCompanies with website in DB now: ${withWebsite}`);
}

main()
  .catch((e) => {
    console.error('Failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
