import { prisma } from '@ecommerce-hr/db';
import { runAuditAgent } from '@ecommerce-hr/ai';
import { emitEvent } from '../lib/event-bus.js';
import { DomainEvents } from '@ecommerce-hr/shared';
import { logger } from '../utils/logger.js';

export async function runAudit(websiteUrl: string) {
  await emitEvent(DomainEvents.AUDIT_REQUESTED, { websiteUrl });

  try {
    await emitEvent(DomainEvents.AUDIT_IN_PROGRESS, { websiteUrl });

    const result = await runAuditAgent(websiteUrl);

    const report = await prisma.auditReport.create({
      data: {
        websiteUrl,
        scores: JSON.parse(JSON.stringify(result.scores)),
        recommendations: JSON.parse(JSON.stringify(result.recommendations)),
      },
    });

    await emitEvent(DomainEvents.AUDIT_COMPLETED, {
      reportId: report.id,
      websiteUrl,
      scores: result.scores,
    });

    return { ...report, summary: result.summary };
  } catch (error) {
    logger.error({ error, websiteUrl }, 'Audit failed');
    await emitEvent(DomainEvents.AUDIT_FAILED, { websiteUrl, error: String(error) });
    throw error;
  }
}

export async function getAuditById(id: string) {
  return prisma.auditReport.findUnique({ where: { id } });
}

export async function getAudits(page: number, limit: number) {
  const skip = (page - 1) * limit;

  const [audits, total] = await Promise.all([
    prisma.auditReport.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.auditReport.count(),
  ]);

  return { audits, total };
}
