import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

const MEMBER_ID = 'cmqg6nyo000krx5jwp7nr0gdt'; // Majstori svijeca d.o.o.

async function main() {
  const logs = await p.emailLog.findMany({
    where: { OR: [{ memberId: MEMBER_ID }, { to: 'mario@majstorisvijeca.com' }] },
    orderBy: { sentAt: 'desc' },
    take: 30,
    select: { subject: true, templateName: true, status: true, sentAt: true, to: true },
  });
  console.log('EMAIL LOGS:', JSON.stringify(logs, null, 2));

  const autoLogs = await p.automationLog.findMany({
    where: { executedAt: { gte: new Date('2026-07-01') } },
    orderBy: { executedAt: 'desc' },
    select: { event: true, payload: true, result: true, success: true, error: true, executedAt: true, sequenceId: true },
  });
  const mine = autoLogs.filter((l) => (l.payload as any)?.memberId === MEMBER_ID);
  console.log('AUTOMATION LOGS (member):', JSON.stringify(mine, null, 2));

  const seqs = await p.sequence.findMany({
    select: { id: true, name: true, status: true, triggerEvent: true, steps: true, updatedAt: true, createdAt: true },
  });
  console.log('SEQUENCES:', JSON.stringify(seqs, null, 2));

  await p.$disconnect();
}

main().catch(console.error);
