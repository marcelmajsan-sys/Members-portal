import XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';

const p = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

async function main() {
  const members = await p.member.findMany({
    where: { status: 'ACTIVE', isLead: false },
    select: {
      user: { select: { firstName: true, lastName: true, email: true } },
    },
    orderBy: [{ user: { lastName: 'asc' } }, { user: { firstName: 'asc' } }],
  });

  // Dedup po (ime, prezime, email) — isti korisnik može imati više članstava.
  const seen = new Set<string>();
  const rows: Record<string, string>[] = [];
  for (const m of members) {
    const ime = m.user.firstName ?? '';
    const prezime = m.user.lastName ?? '';
    const email = m.user.email ?? '';
    const key = `${ime}|${prezime}|${email}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ 'Ime': ime, 'Prezime': prezime, 'Email': email });
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 35 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Aktivni članovi');

  const out = process.argv[2] || 'aktivni-clanovi.xlsx';
  XLSX.writeFile(wb, out);
  console.log(`Zapisano ${rows.length} aktivnih članova u ${out}`);

  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
