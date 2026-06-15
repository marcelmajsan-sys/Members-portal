import { prisma, type CertificationStatus } from '@ecommerce-hr/db';
import { reviewCertification } from '@ecommerce-hr/ai';
import { emitEvent } from '../lib/event-bus.js';
import { DomainEvents } from '@ecommerce-hr/shared';

export async function submitCertification(memberId: string, applicationData: Record<string, unknown>) {
  const certification = await prisma.safeShopCertification.create({
    data: {
      memberId,
      applicationData: JSON.parse(JSON.stringify(applicationData)),
      status: 'PENDING',
    },
    include: { member: true },
  });

  await emitEvent(DomainEvents.CERTIFICATION_SUBMITTED, {
    certificationId: certification.id,
    memberId,
  });

  return certification;
}

export async function getCertificationById(id: string) {
  return prisma.safeShopCertification.findUnique({
    where: { id },
    include: { member: true, reviews: true },
  });
}

export async function getCertifications(page: number, limit: number, status?: CertificationStatus) {
  const skip = (page - 1) * limit;
  const where = status ? { status } : {};

  const [certifications, total] = await Promise.all([
    prisma.safeShopCertification.findMany({
      where,
      skip,
      take: limit,
      include: { member: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.safeShopCertification.count({ where }),
  ]);

  return { certifications, total };
}

export async function updateCertificationStatus(
  id: string,
  status: CertificationStatus,
  reviewNotes?: string,
) {
  const data: Record<string, unknown> = { status };
  if (reviewNotes) data.reviewNotes = reviewNotes;
  if (status === 'APPROVED') {
    data.certifiedAt = new Date();
    data.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
  }

  const certification = await prisma.safeShopCertification.update({
    where: { id },
    data,
    include: { member: true },
  });

  const event = status === 'APPROVED'
    ? DomainEvents.CERTIFICATION_APPROVED
    : status === 'REJECTED'
      ? DomainEvents.CERTIFICATION_REJECTED
      : null;

  if (event) {
    await emitEvent(event, { certificationId: id, memberId: certification.memberId });
  }

  return certification;
}

export async function runAiReview(certificationId: string) {
  const certification = await prisma.safeShopCertification.findUnique({
    where: { id: certificationId },
    include: { member: true },
  });

  if (!certification) throw new Error('Certification not found');

  await emitEvent(DomainEvents.CERTIFICATION_UNDER_REVIEW, {
    certificationId,
    memberId: certification.memberId,
  });

  const result = await reviewCertification(
    certification.applicationData as Record<string, unknown>,
  );

  const review = await prisma.safeShopReview.create({
    data: {
      certificationId,
      reviewerNotes: result.reasoning,
      score: result.score,
      reviewedAt: new Date(),
    },
  });

  // Auto-update status based on AI decision
  if (result.decision === 'approve') {
    await updateCertificationStatus(certificationId, 'APPROVED', result.reasoning);
  } else {
    await updateCertificationStatus(certificationId, 'REJECTED', result.reasoning);
  }

  return { review, result };
}

export async function getMemberCertifications(memberId: string) {
  return prisma.safeShopCertification.findMany({
    where: { memberId },
    include: { reviews: true },
    orderBy: { createdAt: 'desc' },
  });
}
