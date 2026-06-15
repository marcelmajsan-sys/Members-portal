import XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';

const DATABASE_URL = process.env.DATABASE_URL;

const prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });

async function main() {
  // Find Marcel (OWNER) to use as author
  const marcel = await prisma.user.findFirst({ where: { role: 'OWNER' } });
  if (!marcel) throw new Error('No OWNER user found');
  console.log(`Author: ${marcel.firstName} ${marcel.lastName} (${marcel.id})`);

  const wb = XLSX.readFile('/Users/nikolabudisa/Downloads/Popis članova - aktualan.xlsx');
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { defval: '' }) as any[];

  const withNotes = data.filter(r => r['komentar']?.toString().trim().length > 0);
  console.log(`Found ${withNotes.length} rows with notes`);

  let created = 0;
  let skipped = 0;
  let notFound = 0;

  for (const row of withNotes) {
    const email = (row['Email 1. član'] || '').toString().trim().toLowerCase();
    const note = row['komentar'].toString().trim();

    if (!email) {
      console.log(`SKIP: no email, note="${note}"`);
      skipped++;
      continue;
    }

    // Find user by email
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      include: { member: true },
    });

    if (!user || !user.member) {
      console.log(`NOT FOUND: ${email} — note="${note}"`);
      notFound++;
      continue;
    }

    // Check if note already exists (avoid duplicates)
    const existing = await prisma.memberNote.findFirst({
      where: { memberId: user.member.id, content: note },
    });

    if (existing) {
      console.log(`ALREADY EXISTS: ${email} — "${note}"`);
      skipped++;
      continue;
    }

    // Create MemberNote
    await prisma.memberNote.create({
      data: {
        memberId: user.member.id,
        authorId: marcel.id,
        content: note,
      },
    });

    console.log(`CREATED: ${email} — "${note}"`);
    created++;
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped, ${notFound} not found`);
  await prisma.$disconnect();
}

main().catch(console.error);
