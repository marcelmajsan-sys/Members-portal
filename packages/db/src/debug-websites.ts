import XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';

const p = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL },
  },
});

const wb = XLSX.readFile('/Users/nikolabudisa/Downloads/Popis članova - aktualan.xlsx');

async function main() {
  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: '' }) as Record<string, unknown>[];
    const withUrl = rows.filter((r) => String(r['URL webshopa'] || '').includes('.')).slice(0, 5);
    console.log('\nSheet:', name, '- rows with URL:', rows.filter((r) => String(r['URL webshopa'] || '').includes('.')).length);

    for (const r of withUrl) {
      const e1 = String(r['Email 1. član'] || '').trim().toLowerCase().replace(/\s/g, '');
      const e2 = String(r['Email tvrtke'] || r['E-mail tvrtke'] || '').trim().toLowerCase().replace(/\s/g, '');
      const email = e1 || e2;
      const user = await p.user.findUnique({ where: { email }, select: { id: true } });
      const found = user ? 'YES' : 'NO';
      console.log(`  ${email} -> ${r['URL webshopa']} [DB: ${found}]`);
    }
  }
  await p.$disconnect();
}

main().catch(console.error);
