/**
 * One-time cleanup of malformed (import-concatenated) emails/names left after
 * the dedup. Each value below was confirmed with the user.
 *
 * Run:  APPLY=1 pnpm -F @ecommerce-hr/db exec tsx --env-file=../../.env src/fix-malformed-emails.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.env.APPLY === '1';

// Primary members: set clean login email; push the discarded alt into member notes.
const PRIMARY: { userId: string; email: string; altNote?: string }[] = [
  { userId: 'cmqg6ooj7010qx5jwv9vh5j52', email: 'ecommerce@europa92.hr' }, // Europa 92 / Josipa (alt = Romanin SC)
  { userId: 'cmqg6ogu700wkx5jw9r8l710g', email: 'marijan.sokacic@gmail.com', altNote: 'Alt email: marijan@sape.hr' }, // M.A.I.R
  { userId: 'cmqg6oe2s00usx5jwajedsrzk', email: 'vesna@tadic.si', altNote: 'Alt email: info@mobos.si' }, // MOBOS
  { userId: 'cmqg6of7700vgx5jwwc9nc4z3', email: 'sonja.buha@mona.rs', altNote: 'Alt email: online@mona.hr' }, // Modna kuća Mona
  { userId: 'cmqg6nh84008wx5jwainop816', email: 'info@okosokolovo.hr', altNote: 'Alt email: sokolprimas@gmail.com' }, // Oko Sokolovo
  { userId: 'cmqg6o2km00n8x5jw43m89kw4', email: 'danijel@promopop.hr', altNote: 'Alt email: karazijadanijel@gmail.com' }, // Promopop
];

// Secondary contacts: keep first person clean; extra person (if any) → member notes.
const SECONDARY: {
  scId: string;
  firstName: string; lastName: string; email: string; phone?: string;
  extraNote?: string;
}[] = [
  { scId: 'cmqmo5vom000jx5xcsan4sbhl', firstName: 'Morana', lastName: 'Stričić Petrović', email: 'morana.stricic.petrovic@ingemark.com', extraNote: 'Dodatna kontakt osoba: Tomislav Kosanović <tomislav.kosanovic@ingemark.com>' }, // Ingemark
  { scId: 'cmqmo72mp003dx5xcoys867t3', firstName: 'Ana', lastName: 'Vuksanović', email: 'ana.vuksanovic@monri.com', extraNote: 'Dodatna kontakt osoba: Ivana Kurtović Skorić <ivana.kurtovic.skoric@asee.io>' }, // Monri
  { scId: 'cmqmo6bl9001lx5xcv7pkord2', firstName: 'Kristijan', lastName: 'Kristic', email: 'kristijan@rox.hr', extraNote: 'Dodatna kontakt osoba: Ivan Glibić <ivan.glibic@rox.hr>' }, // Rox
  { scId: 'cmqmo6n9c002fx5xcch67qck9', firstName: 'Katarina', lastName: 'Tančić', email: 'katarina.tancic@thingsolver.com', extraNote: 'Dodatna kontakt osoba: Anđela Ćulibrk <andjela.culibrk@thingsolver.com>' }, // Things Solver
  { scId: 'cmqmo6as2001jx5xci5egad7e', firstName: 'Zoran', lastName: 'Preradović', email: 'info@termol.hr' }, // Termol
  { scId: 'cmqmo6d4n001px5xcuzbgjeij', firstName: 'Romana', lastName: 'Blažević', email: 'marketing@europa92.hr', phone: '+385995420149' }, // Europa 92
];

async function appendNote(memberId: string, line: string) {
  const m = await prisma.member.findUnique({ where: { id: memberId }, select: { notes: true } });
  const notes = m?.notes ? `${m.notes}\n${line}` : line;
  await prisma.member.update({ where: { id: memberId }, data: { notes } });
}

async function main() {
  console.log(`\n=== Fix malformed emails — ${APPLY ? 'APPLY' : 'DRY RUN'} ===\n`);

  for (const p of PRIMARY) {
    const u = await prisma.user.findUnique({ where: { id: p.userId }, include: { member: true } });
    console.log(`PRIMARY ${u?.firstName} ${u?.lastName}: ${u?.email}  →  ${p.email}${p.altNote ? `  (note: ${p.altNote})` : ''}`);
    if (!APPLY) continue;
    await prisma.user.update({ where: { id: p.userId }, data: { email: p.email } });
    if (p.altNote && u?.member) await appendNote(u.member.id, p.altNote);
  }

  console.log('');
  for (const s of SECONDARY) {
    const sc = await prisma.secondaryContact.findUnique({ where: { id: s.scId } });
    console.log(`SECOND  ${sc?.firstName?.replace(/\n/g, '⏎')} ${sc?.lastName?.replace(/\n/g, '⏎')}: ${sc?.email}  →  ${s.firstName} ${s.lastName} <${s.email}>${s.extraNote ? `  (+note)` : ''}`);
    if (!APPLY) continue;
    await prisma.secondaryContact.update({
      where: { id: s.scId },
      data: { firstName: s.firstName, lastName: s.lastName, email: s.email, ...(s.phone ? { phone: s.phone } : {}) },
    });
    if (s.extraNote && sc) await appendNote(sc.memberId, s.extraNote);
  }

  if (!APPLY) console.log('\n(DRY RUN — nothing written. Re-run with APPLY=1.)');
  else console.log('\n✓ Applied.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
