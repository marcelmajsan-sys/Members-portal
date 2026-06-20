/**
 * One-time cleanup: one company = 1 member.
 *
 * The original import created a separate Member+User per contact person.
 * This script consolidates each company to a single primary member:
 *   - Primary = member with the most activity (login/payments/notes/...),
 *     tie-break by oldest (createdAt asc).
 *   - All related records of secondary members are reassigned to the primary.
 *   - The second person is preserved as the primary's SecondaryContact
 *     (additional persons, e.g. 3rd at HP, are appended to the primary's notes).
 *   - The now-empty secondary Member + its login User are deleted.
 *
 * Run dry-run (default):   pnpm -F @ecommerce-hr/db exec tsx --env-file=../../.env src/merge-duplicate-members.ts
 * Run for real:            APPLY=1 pnpm -F @ecommerce-hr/db exec tsx --env-file=../../.env src/merge-duplicate-members.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.env.APPLY === '1';

type CountKey =
  | 'payments' | 'invoices' | 'emailLogs' | 'memberBenefits' | 'offers'
  | 'certifications' | 'enrollments' | 'certificates' | 'memberNotes'
  | 'webshopAnalyses' | 'memberProducts' | 'priceAlerts' | 'starterShops'
  | 'legalQueries';

const COUNT_SELECT = {
  payments: true, invoices: true, emailLogs: true, memberBenefits: true,
  offers: true, certifications: true, enrollments: true, certificates: true,
  memberNotes: true, webshopAnalyses: true, memberProducts: true,
  priceAlerts: true, starterShops: true, legalQueries: true,
} as const;

function activityScore(m: {
  lastLoginAt: Date | null;
  secondaryContact: unknown | null;
  _count: Record<CountKey, number>;
}): number {
  const c = m._count;
  const sum = (Object.keys(COUNT_SELECT) as CountKey[]).reduce((a, k) => a + c[k], 0);
  return (m.lastLoginAt ? 5 : 0) + (m.secondaryContact ? 1 : 0) + sum;
}

function fmtPerson(u: { firstName: string; lastName: string; email: string }) {
  return `${u.firstName} ${u.lastName} <${u.email}>`.trim();
}

// A clean single contact email — no commas, no whitespace, exactly one '@'.
function isCleanEmail(email: string): boolean {
  return /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(email.trim());
}

async function main() {
  console.log(`\n=== Merge duplicate members — ${APPLY ? 'APPLY (writing)' : 'DRY RUN'} ===\n`);

  // Companies with more than one member.
  const grouped = await prisma.member.groupBy({
    by: ['companyId'],
    _count: { _all: true },
    having: { companyId: { _count: { gt: 1 } } },
  });
  const dupCompanyIds = grouped.map((g) => g.companyId);
  console.log(`Companies with duplicate members: ${dupCompanyIds.length}\n`);

  let mergedSecondaries = 0;
  let movedToSecondaryContact = 0;
  let movedToNote = 0;

  for (const companyId of dupCompanyIds) {
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    const members = await prisma.member.findMany({
      where: { companyId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        secondaryContact: true,
        _count: { select: COUNT_SELECT },
      },
    });

    // primary = highest activity, then a clean email, then oldest.
    members.sort((a, b) => {
      const d = activityScore(b) - activityScore(a);
      if (d !== 0) return d;
      const e = Number(isCleanEmail(b.user.email)) - Number(isCleanEmail(a.user.email));
      if (e !== 0) return e;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
    const [primary, ...secondaries] = members;

    const flag = isCleanEmail(primary.user.email) ? '' : '  ⚠ malformed email (no clean alternative)';
    console.log(`■ ${company?.name} (OIB ${company?.oib})`);
    console.log(`   KEEP  : ${fmtPerson(primary.user)}  [score ${activityScore(primary)}]${flag}`);
    for (const s of secondaries) {
      console.log(`   merge : ${fmtPerson(s.user)}  [score ${activityScore(s)}]`);
    }

    if (!APPLY) {
      console.log('');
      continue;
    }

    await prisma.$transaction(async (tx) => {
      let primaryHasSC = !!primary.secondaryContact;

      for (const s of secondaries) {
        // --- Reassign unique-constrained children (skip on conflict) ---
        // MemberBenefit @@unique([benefitId, memberId])
        const sBenefits = await tx.memberBenefit.findMany({ where: { memberId: s.id } });
        for (const mb of sBenefits) {
          const clash = await tx.memberBenefit.findUnique({
            where: { benefitId_memberId: { benefitId: mb.benefitId, memberId: primary.id } },
          });
          if (clash) await tx.memberBenefit.delete({ where: { id: mb.id } });
          else await tx.memberBenefit.update({ where: { id: mb.id }, data: { memberId: primary.id } });
        }
        // AcademyEnrollment @@unique([memberId, moduleId])
        const sEnroll = await tx.academyEnrollment.findMany({ where: { memberId: s.id } });
        for (const en of sEnroll) {
          const clash = await tx.academyEnrollment.findUnique({
            where: { memberId_moduleId: { memberId: primary.id, moduleId: en.moduleId } },
          });
          if (clash) await tx.academyEnrollment.delete({ where: { id: en.id } });
          else await tx.academyEnrollment.update({ where: { id: en.id }, data: { memberId: primary.id } });
        }
        // MemberProduct @@unique([memberId, name])
        const sProducts = await tx.memberProduct.findMany({ where: { memberId: s.id } });
        for (const p of sProducts) {
          const clash = await tx.memberProduct.findFirst({
            where: { memberId: primary.id, name: p.name },
          });
          if (clash) await tx.memberProduct.delete({ where: { id: p.id } });
          else await tx.memberProduct.update({ where: { id: p.id }, data: { memberId: primary.id } });
        }

        // --- Reassign remaining children (no unique conflict possible) ---
        await tx.payment.updateMany({ where: { memberId: s.id }, data: { memberId: primary.id } });
        await tx.invoice.updateMany({ where: { memberId: s.id }, data: { memberId: primary.id } });
        await tx.emailLog.updateMany({ where: { memberId: s.id }, data: { memberId: primary.id } });
        await tx.offer.updateMany({ where: { memberId: s.id }, data: { memberId: primary.id } });
        await tx.safeShopCertification.updateMany({ where: { memberId: s.id }, data: { memberId: primary.id } });
        await tx.academyCertificate.updateMany({ where: { memberId: s.id }, data: { memberId: primary.id } });
        await tx.memberNote.updateMany({ where: { memberId: s.id }, data: { memberId: primary.id } });
        await tx.webshopAnalysis.updateMany({ where: { memberId: s.id }, data: { memberId: primary.id } });
        await tx.priceAlert.updateMany({ where: { memberId: s.id }, data: { memberId: primary.id } });
        await tx.starterShop.updateMany({ where: { memberId: s.id }, data: { memberId: primary.id } });
        await tx.legalQuery.updateMany({ where: { memberId: s.id }, data: { memberId: primary.id } });

        // --- Preserve the second person ---
        const personData = {
          firstName: s.user.firstName,
          lastName: s.user.lastName,
          email: s.user.email,
          address: s.personalAddress,
          zip: s.personalZip,
          city: s.personalCity,
          country: s.personalCountry,
          oib: s.personalOib,
          dateOfBirth: s.dateOfBirth,
          phone: s.personalPhone,
          note: s.personalNote,
        };

        if (!primaryHasSC) {
          await tx.secondaryContact.create({ data: { memberId: primary.id, ...personData } });
          primaryHasSC = true;
          movedToSecondaryContact++;
        } else {
          // No slot left for a structured second person → append to notes.
          const line = `Dodatna kontakt osoba: ${fmtPerson(s.user)}${s.personalPhone ? `, tel ${s.personalPhone}` : ''}`;
          const existing = (await tx.member.findUnique({ where: { id: primary.id }, select: { notes: true } }))?.notes;
          await tx.member.update({
            where: { id: primary.id },
            data: { notes: existing ? `${existing}\n${line}` : line },
          });
          movedToNote++;
        }

        // Drop the secondary member's own SecondaryContact (if any) — its data
        // belongs to a person we're removing; cascade would delete it anyway.
        await tx.secondaryContact.deleteMany({ where: { memberId: s.id } });

        // --- Delete the empty secondary member, then its login user ---
        await tx.member.delete({ where: { id: s.id } });
        await tx.user.delete({ where: { id: s.user.id } });
        mergedSecondaries++;
      }
    });

    console.log('   ✓ merged\n');
  }

  console.log('=== Summary ===');
  console.log(`Duplicate companies processed : ${dupCompanyIds.length}`);
  console.log(`Secondary members merged      : ${mergedSecondaries}`);
  console.log(`→ saved as SecondaryContact   : ${movedToSecondaryContact}`);
  console.log(`→ appended to member notes     : ${movedToNote}`);
  if (!APPLY) console.log('\n(DRY RUN — nothing was written. Re-run with APPLY=1 to apply.)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
