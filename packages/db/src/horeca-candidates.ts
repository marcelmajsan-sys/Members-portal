import { PrismaClient } from '@prisma/client';

const p = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

async function main() {
  const members = await p.member.findMany({
    where: { status: 'ACTIVE', isLead: false },
    select: {
      memberType: true,
      memberTier: true,
      website: true,
      notes: true,
      extraWebshops: true,
      user: { select: { firstName: true, lastName: true, email: true } },
      company: { select: { name: true, website: true, note: true, city: true } },
    },
  });

  const rows = members.map((m) => ({
    company: m.company?.name ?? '',
    web: m.website || m.company?.website || '',
    extra: (m.extraWebshops || []).join(' '),
    type: m.memberType,
    tier: m.memberTier,
    city: m.company?.city ?? '',
    note: [m.notes, m.company?.note].filter(Boolean).join(' | '),
    email: m.user?.email ?? '',
  }));

  console.log(JSON.stringify(rows, null, 0));
  console.log('TOTAL:', rows.length);
  await p.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
