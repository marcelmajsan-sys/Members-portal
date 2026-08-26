import { PrismaClient } from '@prisma/client';

// Pronađi duple tvrtke (čest izvor prividnih duplikata članova iz uvoza).
// Registracija/kreiranje reuse-a tvrtku po OIB-u, ali uvoz je mogao stvoriti više Company
// zapisa za istu firmu. Grupiramo po OIB-u (tvrdi duplikat) i po normaliziranom nazivu (meki).
//
// Read-only. Pokretanje:
//   cd packages/db && DATABASE_URL=<6543> node_modules/.bin/tsx src/find-duplicate-companies.ts

const p = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

const normName = (s: string | null | undefined) =>
  (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.,]/g, '').replace(/\b(d\s?o\s?o|j\s?d\s?o\s?o|obrt|d\s?d)\b/g, '').trim();
const normOib = (s: string | null | undefined) => (s ?? '').replace(/\D/g, '');

async function main() {
  const companies = await p.company.findMany({
    select: {
      id: true,
      name: true,
      oib: true,
      website: true,
      createdAt: true,
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Ukupno tvrtki: ${companies.length}\n`);

  // 1) Isti OIB u više zapisa = tvrdi duplikat
  const byOib = new Map<string, typeof companies>();
  for (const c of companies) {
    const k = normOib(c.oib);
    if (!k) continue; // prazan OIB obrađen kroz naziv
    if (!byOib.has(k)) byOib.set(k, []);
    byOib.get(k)!.push(c);
  }
  const oibDupes = [...byOib.entries()].filter(([, list]) => list.length > 1);

  console.log('════════════════════════════════════════════════════════');
  console.log(`TVRDI DUPLIKATI TVRTKI (isti OIB): ${oibDupes.length}`);
  console.log('════════════════════════════════════════════════════════');
  if (oibDupes.length === 0) console.log('Nema.\n');
  for (const [oib, list] of oibDupes) {
    console.log(`OIB ${oib}:`);
    for (const c of list) {
      console.log(`    "${c.name}" — ${c.website ?? '(bez weba)'} — ${c._count.members} član(ova) — ${c.id}`);
    }
  }
  console.log('');

  // 2) Isti normalizirani naziv, a različiti/prazni OIB = meki duplikat (pregledati ručno)
  const byName = new Map<string, typeof companies>();
  for (const c of companies) {
    const k = normName(c.name);
    if (!k) continue;
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k)!.push(c);
  }
  const nameDupes = [...byName.entries()].filter(([, list]) => {
    if (list.length < 2) return false;
    // preskoči one koji su već uhvaćeni kao isti OIB (svi isti neprazni OIB)
    const oibs = new Set(list.map((c) => normOib(c.oib)).filter(Boolean));
    return !(oibs.size === 1 && list.every((c) => normOib(c.oib)));
  });

  console.log('════════════════════════════════════════════════════════');
  console.log(`MEKI DUPLIKATI (isti naziv, različit/prazan OIB — pregledati): ${nameDupes.length}`);
  console.log('════════════════════════════════════════════════════════');
  if (nameDupes.length === 0) console.log('Nema.');
  for (const [, list] of nameDupes) {
    console.log(`"${list[0].name}":`);
    for (const c of list) {
      console.log(`    OIB ${c.oib || '(prazan)'} — ${c.website ?? '(bez weba)'} — ${c._count.members} član(ova) — ${c.id}`);
    }
  }

  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
