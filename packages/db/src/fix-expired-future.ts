import { PrismaClient } from '@prisma/client';

// Popravlja članove kojima je status=EXPIRED, a datum isteka (expiresAt) je u BUDUĆNOSTI.
// Takvi su nastali kad je produžen datum isteka (npr. kroz uređivanje profila) bez promjene
// statusa — pa se u tražilici prikazuju crveno i ne mogu se prijaviti (isActive=false).
// Fix: status -> ACTIVE, user.isActive -> true. Ne dira leadove ni PENDING (obrisane) ni SUSPENDED.
//
// Pokretanje: postavi DATABASE_URL i:
//   pnpm --filter @ecommerce-hr/db exec tsx src/fix-expired-future.ts        (dry-run, samo ispis)
//   APPLY=1 pnpm --filter @ecommerce-hr/db exec tsx src/fix-expired-future.ts (primijeni)

const p = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
const APPLY = process.env.APPLY === '1';

async function main() {
  const now = new Date();
  const affected = await p.member.findMany({
    where: { status: 'EXPIRED', isLead: false, expiresAt: { gt: now } },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true, isActive: true } },
      company: { select: { name: true } },
    },
    orderBy: { expiresAt: 'asc' },
  });

  console.log(`Pronađeno ${affected.length} članova (status=EXPIRED, a expiresAt u budućnosti):\n`);
  for (const m of affected) {
    console.log(`• ${m.user.firstName} ${m.user.lastName} <${m.user.email}> — ${m.company?.name ?? '?'}`);
    console.log(`  memberId=${m.id}  isActive=${m.user.isActive}  expiresAt=${m.expiresAt?.toISOString()}`);
  }

  if (affected.length === 0) { await p.$disconnect(); return; }

  if (!APPLY) {
    console.log('\n[DRY-RUN] Ništa nije promijenjeno. Pokreni s APPLY=1 za primjenu.');
    await p.$disconnect();
    return;
  }

  const memberIds = affected.map((m) => m.id);
  const userIds = [...new Set(affected.map((m) => m.user.id))];

  const [mUpd, uUpd] = await p.$transaction([
    p.member.updateMany({ where: { id: { in: memberIds } }, data: { status: 'ACTIVE' } }),
    p.user.updateMany({ where: { id: { in: userIds } }, data: { isActive: true } }),
  ]);

  console.log(`\n[APPLY] Ažurirano: ${mUpd.count} članova -> ACTIVE, ${uUpd.count} korisnika -> isActive=true.`);
  await p.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
