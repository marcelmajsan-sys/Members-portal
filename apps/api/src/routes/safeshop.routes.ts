import { Router } from 'express';
import {
  submitCertificationSchema,
  updateCertificationStatusSchema,
  paginationSchema,
  idParamSchema,
} from '@ecommerce-hr/shared';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validate, validateQuery, validateParams } from '../middleware/validate.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/api-response.js';
import type { AuthRequest } from '../middleware/auth.js';
import { prisma } from '@ecommerce-hr/db';
import {
  submitCertification,
  getCertificationById,
  getCertifications,
  updateCertificationStatus,
  runAiReview,
  getMemberCertifications,
} from '../services/safeshop.service.js';

const router = Router();

router.use(authenticate);

// POST /certifications — submit certification application
router.post(
  '/certifications',
  validate(submitCertificationSchema),
  async (req: AuthRequest, res) => {
    const member = await prisma.member.findFirst({ where: { userId: req.user!.userId } });
    if (!member) {
      errorResponse(res, 'NOT_FOUND', 'Member not found', 404);
      return;
    }
    const certification = await submitCertification(member.id, req.body);
    successResponse(res, certification, 201);
  },
);

// GET /certifications — list certifications (OWNER/OPERATOR see all, MEMBER sees own)
router.get(
  '/certifications',
  validateQuery(paginationSchema),
  async (req: AuthRequest, res) => {
    const { page, limit } = res.locals.query as { page: number; limit: number };
    const role = req.user!.role;

    if (role === 'OWNER' || role === 'OPERATOR') {
      const { certifications, total } = await getCertifications(page, limit);
      paginatedResponse(res, certifications, { page, limit, total });
    } else {
      const member = await prisma.member.findFirst({ where: { userId: req.user!.userId } });
      if (!member) {
        errorResponse(res, 'NOT_FOUND', 'Member not found', 404);
        return;
      }
      const certs = await getMemberCertifications(member.id);
      successResponse(res, certs);
    }
  },
);

// GET /certifications/:id — get single certification
router.get(
  '/certifications/:id',
  validateParams(idParamSchema),
  async (req: AuthRequest, res) => {
    const cert = await getCertificationById(req.params.id as string);
    if (!cert) {
      errorResponse(res, 'NOT_FOUND', 'Certification not found', 404);
      return;
    }
    successResponse(res, cert);
  },
);

// PATCH /certifications/:id/status — update status (OWNER/OPERATOR only)
router.patch(
  '/certifications/:id/status',
  requireRole('OWNER', 'OPERATOR'),
  validateParams(idParamSchema),
  validate(updateCertificationStatusSchema),
  async (req: AuthRequest, res) => {
    try {
      const cert = await updateCertificationStatus(
        req.params.id as string,
        req.body.status,
        req.body.reviewNotes,
      );
      successResponse(res, cert);
    } catch {
      errorResponse(res, 'NOT_FOUND', 'Certification not found', 404);
    }
  },
);

// POST /certifications/:id/ai-review — trigger AI review (OWNER/OPERATOR only)
router.post(
  '/certifications/:id/ai-review',
  requireRole('OWNER', 'OPERATOR'),
  validateParams(idParamSchema),
  async (req: AuthRequest, res) => {
    try {
      const result = await runAiReview(req.params.id as string);
      successResponse(res, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI review failed';
      errorResponse(res, 'AI_REVIEW_FAILED', message, 500);
    }
  },
);

export default router;
