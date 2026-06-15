import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const members = await p.member.findMany({
    where: { user: { email: { contains: 'marcel.majsan' } } },
    select: { id: true, user: { select: { email: true, firstName: true } } }
  });
  console.log('Members:', JSON.stringify(members, null, 2));

  if (members.length > 0) {
    const m = members[0];
    const logs = await p.emailLog.findMany({
      where: { OR: [{ memberId: m.id }, { to: m.user.email }] },
      select: { id: true, subject: true, to: true, memberId: true, sentAt: true, body: true }
    });
    console.log('Email logs for member:', logs.map(l => ({ ...l, body: l.body ? '[HAS BODY]' : null })));
  }

  const recent = await p.emailLog.findMany({
    orderBy: { sentAt: 'desc' },
    take: 5,
    select: { id: true, subject: true, to: true, memberId: true, sentAt: true }
  });
  console.log('Recent 5 logs:', JSON.stringify(recent, null, 2));

  await p.$disconnect();
}

main().catch(console.error);
