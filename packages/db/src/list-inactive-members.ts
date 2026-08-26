import { PrismaClient } from '@prisma/client';

// Izlistaj sve MEMBER korisnike s isActive=false — oni na loginu dobivaju
// "Vaš račun trenutačno nije aktivan" i reset lozinke im NE pomaže (reset ne dira isActive).
// Reaktivacija: admin → profil člana → "Pošalji pristup članu" ili "Postavi lozinku".
//
// Pokretanje (lokalno, read-only): postavi DATABASE_URL na 6543 pooler i:
//   pnpm --filter @ecommerce-hr/db exec tsx src/list-inactive-members.ts

const p = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

async function main() {
  const users = await p.user.findMany({
    where: { role: 'MEMBER', isActive: false },
    select: {
      email: true,
      firstName: true,
      lastName: true,
      members: {
        select: {
          id: true,
          status: true,
          isLead: true,
          company: { select: { name: true } },
        },
      },
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  });

  if (users.length === 0) {
    console.log('Nema deaktiviranih MEMBER korisnika (isActive=false). Sve čisto.');
    await p.$disconnect();
    return;
  }

  // Sažetak po statusu članstva (jesu li svi EXPIRED ili ima i ACTIVE-ih koji su omaškom ugašeni)
  const byStatus = new Map<string, number>();
  let hasActiveMembership = 0;
  for (const u of users) {
    const memberships = u.members.filter((m) => !m.isLead);
    for (const m of memberships) byStatus.set(m.status, (byStatus.get(m.status) ?? 0) + 1);
    if (memberships.some((m) => m.status === 'ACTIVE')) hasActiveMembership++;
  }
  console.log('Sažetak članstava (ne-lead) deaktiviranih korisnika:');
  for (const [status, n] of [...byStatus.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${status}: ${n}`);
  }
  console.log(`  → korisnika s barem jednim ACTIVE članstvom (potencijalno pogrešno ugašeni): ${hasActiveMembership}\n`);

  console.log(`Pronađeno ${users.length} deaktiviranih MEMBER korisnika:\n`);
  for (const u of users) {
    const ime = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || '(bez imena)';
    // Prikaži samo prava članstva (leadovi nemaju portal pristup pa nisu relevantni)
    const memberships = u.members.filter((m) => !m.isLead);
    const info = memberships
      .map((m) => `${m.company?.name ?? '?'} [${m.status}] → /admin/members/${m.id}`)
      .join(', ');
    console.log(`• ${ime} <${u.email}>`);
    console.log(`  ${info || '(nema ne-lead članstva)'}`);
  }

  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
