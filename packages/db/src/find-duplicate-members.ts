import { PrismaClient } from '@prisma/client';

// Pronađi potencijalno duple članove.
// User↔Member je 1:N NAMJERNO (isti email smije imati više članstava za više webshopova),
// pa "duplikat" nije svaki korisnik s >1 članstva, nego članstva koja su ZAPRAVO ista:
// isti korisnik + ista tvrtka + isti (normalizirani) webshop. Takve treba spojiti skriptom
// merge-duplicate-memberships.ts (webshopovi idu u Member.extraWebshops).
//
// Leadovi (isLead=true) se preskaču — oni namjerno dijele email s pravim članstvom.
//
// Pokretanje (read-only, 6543 pooler):
//   cd packages/db && DATABASE_URL=<6543> node_modules/.bin/tsx src/find-duplicate-members.ts

const p = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

// Normalizacija web adrese za usporedbu (skini protokol, www, trailing slash, lowercase)
function normUrl(url: string | null | undefined): string {
  if (!url) return '';
  return url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '');
}

async function main() {
  const members = await p.member.findMany({
    where: { isLead: false },
    select: {
      id: true,
      status: true,
      website: true,
      createdAt: true,
      user: { select: { email: true, firstName: true, lastName: true } },
      company: { select: { id: true, name: true, oib: true, website: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Grupiraj po emailu korisnika (case-insensitive)
  const byEmail = new Map<string, typeof members>();
  for (const m of members) {
    const key = (m.user.email ?? '').toLowerCase();
    if (!byEmail.has(key)) byEmail.set(key, []);
    byEmail.get(key)!.push(m);
  }

  const exactDupes: { email: string; name: string; company: string; web: string; ids: string[] }[] = [];
  const multiSameCompany: { email: string; name: string; company: string; rows: string[] }[] = [];

  for (const [email, list] of byEmail) {
    if (list.length < 2) continue;
    const name = `${list[0].user.firstName ?? ''} ${list[0].user.lastName ?? ''}`.trim();

    // Podgrupiraj po (companyId + normalizirani webshop). Ista podgrupa >1 = TVRDI duplikat.
    const sub = new Map<string, typeof list>();
    for (const m of list) {
      const web = normUrl(m.website ?? m.company?.website);
      const k = `${m.company?.id ?? '?'}::${web}`;
      if (!sub.has(k)) sub.set(k, []);
      sub.get(k)!.push(m);
    }

    for (const [k, group] of sub) {
      if (group.length > 1) {
        const web = k.split('::')[1] || '(bez weba)';
        exactDupes.push({
          email,
          name,
          company: group[0].company?.name ?? '?',
          web,
          ids: group.map((g) => g.id),
        });
      }
    }

    // Ista tvrtka, ali različit webshop = više članstava iste firme (možda legit, možda za spojiti u extraWebshops)
    const companies = new Map<string, typeof list>();
    for (const m of list) {
      const k = m.company?.id ?? '?';
      if (!companies.has(k)) companies.set(k, []);
      companies.get(k)!.push(m);
    }
    for (const [, group] of companies) {
      if (group.length > 1) {
        multiSameCompany.push({
          email,
          name,
          company: group[0].company?.name ?? '?',
          rows: group.map((g) => `${normUrl(g.website ?? g.company?.website) || '(bez weba)'} [${g.status}] ${g.id}`),
        });
      }
    }
  }

  console.log(`Ukupno ne-lead članstava: ${members.length}`);
  console.log(`Jedinstvenih emailova: ${byEmail.size}`);
  console.log(`Emailova s >1 članstva: ${[...byEmail.values()].filter((l) => l.length > 1).length}\n`);

  console.log('════════════════════════════════════════════════════════');
  console.log(`TVRDI DUPLIKATI (isti email + ista tvrtka + isti webshop): ${exactDupes.length}`);
  console.log('→ Kandidati za merge-duplicate-memberships.ts <email>');
  console.log('════════════════════════════════════════════════════════');
  if (exactDupes.length === 0) {
    console.log('Nema tvrdih duplikata.\n');
  } else {
    for (const d of exactDupes) {
      console.log(`• ${d.name} <${d.email}> — ${d.company} — web: ${d.web || '(bez weba)'}`);
      console.log(`    ${d.ids.length}× isti zapis: ${d.ids.join(', ')}`);
    }
    console.log('');
  }

  console.log('════════════════════════════════════════════════════════');
  console.log(`ISTA TVRTKA, RAZLIČIT WEBSHOP (pregledati — možda spojiti u extraWebshops): ${multiSameCompany.length}`);
  console.log('════════════════════════════════════════════════════════');
  for (const d of multiSameCompany) {
    console.log(`• ${d.name} <${d.email}> — ${d.company}`);
    for (const r of d.rows) console.log(`    ${r}`);
  }
  console.log('');

  // Potpunost: emailovi s >1 članstva RAZLIČITIH tvrtki (osoba u više firmi — obično legit, ali pregledati)
  console.log('════════════════════════════════════════════════════════');
  console.log('ISTI EMAIL, RAZLIČITE TVRTKE (info — osoba povezana s više firmi):');
  console.log('════════════════════════════════════════════════════════');
  let multiCompanyCount = 0;
  for (const [email, list] of byEmail) {
    if (list.length < 2) continue;
    const companyIds = new Set(list.map((m) => m.company?.id ?? '?'));
    if (companyIds.size < 2) continue; // već pokriveno gore
    multiCompanyCount++;
    const name = `${list[0].user.firstName ?? ''} ${list[0].user.lastName ?? ''}`.trim();
    console.log(`• ${name} <${email}>`);
    for (const m of list) {
      console.log(`    ${m.company?.name ?? '?'} — ${normUrl(m.website ?? m.company?.website) || '(bez weba)'} [${m.status}] ${m.id}`);
    }
  }
  if (multiCompanyCount === 0) console.log('Nema.');

  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
