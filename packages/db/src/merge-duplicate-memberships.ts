/**
 * Jednokratna skripta: spaja duplicirane profile (članstva) ISTOG korisnika u ISTOJ tvrtki.
 * Zadržava se NAJSTARIJI profil; webshopovi novijih profila sele se u keeper.extraWebshops,
 * svi povezani zapisi (analize, ulaznice, bilješke, emailovi, uplate...) prepisuju se na keeper,
 * a noviji profili se brišu. Pokretanje: pnpm tsx src/merge-duplicate-memberships.ts <email>
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const norm = (u: string) =>
  u.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Upotreba: pnpm tsx src/merge-duplicate-memberships.ts <email>');
    process.exit(1);
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: { id: true, email: true },
  });
  if (!user) throw new Error(`Korisnik ${email} nije pronađen`);

  const members = await prisma.member.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'asc' },
    include: { company: { select: { name: true, website: true } } },
  });
  if (members.length < 2) {
    console.log(`${user.email}: samo ${members.length} profil(a) — nema što spajati.`);
    return;
  }

  const keeper = members[0];
  const dupes = members.slice(1).filter((m) => m.companyId === keeper.companyId);
  if (dupes.length === 0) {
    console.log('Nema duplikata u istoj tvrtki (ostala članstva su za druge tvrtke — ne diram).');
    return;
  }

  console.log(`Keeper: ${keeper.id} (kreiran ${keeper.createdAt.toISOString()}, webshop: ${keeper.website ?? keeper.company.website ?? '—'})`);

  // Webshopovi duplikata → keeper.extraWebshops (bez duplikata i bez glavnog)
  const keeperMain = keeper.website || keeper.company.website || '';
  const extras = [...keeper.extraWebshops];
  for (const d of dupes) {
    for (const raw of [d.website, ...d.extraWebshops]) {
      const site = raw?.trim();
      if (!site) continue;
      if (keeperMain && norm(site) === norm(keeperMain)) continue;
      if (extras.some((x) => norm(x) === norm(site))) continue;
      extras.push(site);
    }
  }

  for (const d of dupes) {
    console.log(`Spajam i brišem duplikat ${d.id} (kreiran ${d.createdAt.toISOString()}, webshop: ${d.website ?? '—'})`);

    // MemberBenefit ima unique [benefitId, memberId] — obriši grantove koje keeper već ima
    const keeperGrants = await prisma.memberBenefit.findMany({ where: { memberId: keeper.id }, select: { benefitId: true } });
    const keeperBenefitIds = new Set(keeperGrants.map((g) => g.benefitId));
    await prisma.memberBenefit.deleteMany({ where: { memberId: d.id, benefitId: { in: [...keeperBenefitIds] } } });

    // SecondaryContact je 1:1 — keeper ima prednost, duplikatov se briše ako keeper već ima
    const keeperSc = await prisma.secondaryContact.findUnique({ where: { memberId: keeper.id } });
    if (keeperSc) await prisma.secondaryContact.deleteMany({ where: { memberId: d.id } });

    await prisma.$transaction([
      prisma.payment.updateMany({ where: { memberId: d.id }, data: { memberId: keeper.id } }),
      prisma.invoice.updateMany({ where: { memberId: d.id }, data: { memberId: keeper.id } }),
      prisma.academyEnrollment.updateMany({ where: { memberId: d.id }, data: { memberId: keeper.id } }),
      prisma.safeShopCertification.updateMany({ where: { memberId: d.id }, data: { memberId: keeper.id } }),
      prisma.academyCertificate.updateMany({ where: { memberId: d.id }, data: { memberId: keeper.id } }),
      prisma.starterShop.updateMany({ where: { memberId: d.id }, data: { memberId: keeper.id } }),
      prisma.legalQuery.updateMany({ where: { memberId: d.id }, data: { memberId: keeper.id } }),
      prisma.memberNote.updateMany({ where: { memberId: d.id }, data: { memberId: keeper.id } }),
      prisma.emailLog.updateMany({ where: { memberId: d.id }, data: { memberId: keeper.id } }),
      prisma.memberProduct.updateMany({ where: { memberId: d.id }, data: { memberId: keeper.id } }),
      prisma.priceAlert.updateMany({ where: { memberId: d.id }, data: { memberId: keeper.id } }),
      prisma.offer.updateMany({ where: { memberId: d.id }, data: { memberId: keeper.id } }),
      prisma.memberBenefit.updateMany({ where: { memberId: d.id }, data: { memberId: keeper.id } }),
      prisma.webshopAnalysis.updateMany({ where: { memberId: d.id }, data: { memberId: keeper.id } }),
      prisma.safeShopAnalysis.updateMany({ where: { memberId: d.id }, data: { memberId: keeper.id } }),
      prisma.memberVisit.updateMany({ where: { memberId: d.id }, data: { memberId: keeper.id } }),
      prisma.secondaryContact.updateMany({ where: { memberId: d.id }, data: { memberId: keeper.id } }),
      prisma.conferenceTicket.updateMany({ where: { memberId: d.id }, data: { memberId: keeper.id } }),
      prisma.member.delete({ where: { id: d.id } }),
    ]);
  }

  await prisma.member.update({ where: { id: keeper.id }, data: { extraWebshops: extras } });
  console.log(`Gotovo. Keeper extraWebshops: ${JSON.stringify(extras)}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
