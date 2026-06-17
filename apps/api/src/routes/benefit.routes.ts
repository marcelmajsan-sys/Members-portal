import { Router } from 'express';
import { prisma } from '@ecommerce-hr/db';
import type { MemberType } from '@ecommerce-hr/db';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { successResponse, errorResponse } from '../utils/api-response.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('OWNER', 'OPERATOR'));

const VALID_TYPES = ['WEB_TRADER', 'SERVICE_PROVIDER', 'PHYSICAL'];

function sanitizeTypes(input: unknown): MemberType[] {
  if (!Array.isArray(input)) return [];
  return input.filter((t): t is MemberType => typeof t === 'string' && VALID_TYPES.includes(t));
}

const benefitInclude = {
  grants: {
    include: {
      member: {
        select: {
          id: true,
          company: { select: { name: true } },
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' as const },
  },
};

// GET /api/os/benefits — all benefits with their grants (members who have/claimed them)
router.get('/', async (_req, res) => {
  const benefits = await prisma.benefit.findMany({
    include: benefitInclude,
    orderBy: { createdAt: 'desc' },
  });
  successResponse(res, benefits);
});

// POST /api/os/benefits — create a benefit
router.post('/', requireRole('OWNER'), async (req: AuthRequest, res) => {
  const { title, description, category, actionUrl, actionLabel, memberTypes } = req.body ?? {};
  if (!title || typeof title !== 'string') {
    errorResponse(res, 'VALIDATION_ERROR', 'Naslov je obavezan', 400);
    return;
  }
  const benefit = await prisma.benefit.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      category: category?.trim() || null,
      actionUrl: actionUrl?.trim() || null,
      actionLabel: actionLabel?.trim() || null,
      memberTypes: sanitizeTypes(memberTypes),
    },
    include: benefitInclude,
  });
  successResponse(res, benefit, 201);
});

// PATCH /api/os/benefits/:id — update a benefit
router.patch('/:id', requireRole('OWNER'), async (req: AuthRequest, res) => {
  const { title, description, category, actionUrl, actionLabel, memberTypes, isActive } = req.body ?? {};
  try {
    const benefit = await prisma.benefit.update({
      where: { id: req.params.id as string },
      data: {
        ...(title !== undefined && { title: String(title).trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(category !== undefined && { category: category?.trim() || null }),
        ...(actionUrl !== undefined && { actionUrl: actionUrl?.trim() || null }),
        ...(actionLabel !== undefined && { actionLabel: actionLabel?.trim() || null }),
        ...(memberTypes !== undefined && { memberTypes: sanitizeTypes(memberTypes) }),
        ...(isActive !== undefined && { isActive: !!isActive }),
      },
      include: benefitInclude,
    });
    successResponse(res, benefit);
  } catch {
    errorResponse(res, 'NOT_FOUND', 'Benefit nije pronađen', 404);
  }
});

// DELETE /api/os/benefits/:id
router.delete('/:id', requireRole('OWNER'), async (req: AuthRequest, res) => {
  try {
    await prisma.benefit.delete({ where: { id: req.params.id as string } });
    successResponse(res, { message: 'Benefit obrisan' });
  } catch {
    errorResponse(res, 'NOT_FOUND', 'Benefit nije pronađen', 404);
  }
});

// POST /api/os/benefits/:id/assign — assign benefit to a specific member
router.post('/:id/assign', requireRole('OWNER'), async (req: AuthRequest, res) => {
  const { memberId } = req.body ?? {};
  if (!memberId) {
    errorResponse(res, 'VALIDATION_ERROR', 'memberId je obavezan', 400);
    return;
  }
  const member = await prisma.member.findUnique({ where: { id: memberId }, select: { id: true } });
  if (!member) {
    errorResponse(res, 'NOT_FOUND', 'Član nije pronađen', 404);
    return;
  }
  await prisma.memberBenefit.upsert({
    where: { benefitId_memberId: { benefitId: req.params.id as string, memberId } },
    update: {},
    create: { benefitId: req.params.id as string, memberId, status: 'AVAILABLE' },
  });
  successResponse(res, { message: 'Benefit dodijeljen članu' });
});

// DELETE /api/os/benefits/:id/assign/:memberId — remove an individual assignment
router.delete('/:id/assign/:memberId', requireRole('OWNER'), async (req: AuthRequest, res) => {
  await prisma.memberBenefit.deleteMany({
    where: { benefitId: req.params.id as string, memberId: req.params.memberId as string },
  });
  successResponse(res, { message: 'Dodjela uklonjena' });
});

export default router;
