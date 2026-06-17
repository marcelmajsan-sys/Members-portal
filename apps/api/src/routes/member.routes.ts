import { Router } from 'express';
import { updateMemberSchema, paginationSchema } from '@ecommerce-hr/shared';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { validate, validateQuery } from '../middleware/validate.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/api-response.js';
import {
  getMemberByUserId,
  updateMemberProfile,
  getMemberDashboard,
  getMemberInvoices,
  getMemberBenefits,
  getMemberEmails,
  getMemberOffers,
} from '../services/member.service.js';

const router = Router();

router.use(authenticate);

// GET /dashboard — member dashboard with stats
router.get('/dashboard', async (req: AuthRequest, res) => {
  const dashboard = await getMemberDashboard(req.user!.userId);

  if (!dashboard) {
    errorResponse(res, 'NOT_FOUND', 'Member profile not found', 404);
    return;
  }

  successResponse(res, dashboard);
});

// GET /profile
router.get('/profile', async (req: AuthRequest, res) => {
  const member = await getMemberByUserId(req.user!.userId);

  if (!member) {
    errorResponse(res, 'NOT_FOUND', 'Member profile not found', 404);
    return;
  }

  successResponse(res, member);
});

// PUT /profile — update profile (personal + company data)
router.put('/profile', async (req: AuthRequest, res) => {
  try {
    const updated = await updateMemberProfile(req.user!.userId, req.body);
    if (!updated) {
      errorResponse(res, 'NOT_FOUND', 'Member profile not found', 404);
      return;
    }
    successResponse(res, updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Profile update failed';
    errorResponse(res, 'UPDATE_FAILED', message, 500);
  }
});

// GET /invoices — paginated invoices
router.get('/invoices', validateQuery(paginationSchema), async (req: AuthRequest, res) => {
  const { page, limit } = res.locals.query as { page: number; limit: number };
  const result = await getMemberInvoices(req.user!.userId, page, limit);

  if (!result) {
    errorResponse(res, 'NOT_FOUND', 'Member profile not found', 404);
    return;
  }

  paginatedResponse(res, result.invoices, { page, limit, total: result.total });
});

// GET /emails — member's email communication (sent + received)
router.get('/emails', async (req: AuthRequest, res) => {
  const emails = await getMemberEmails(req.user!.userId);
  if (!emails) {
    errorResponse(res, 'NOT_FOUND', 'Member profile not found', 404);
    return;
  }
  successResponse(res, emails);
});

// GET /offers — member's offers
router.get('/offers', async (req: AuthRequest, res) => {
  const offers = await getMemberOffers(req.user!.userId);
  if (!offers) {
    errorResponse(res, 'NOT_FOUND', 'Member profile not found', 404);
    return;
  }
  successResponse(res, offers);
});

// GET /benefits — benefits by member type
router.get('/benefits', async (req: AuthRequest, res) => {
  const benefits = await getMemberBenefits(req.user!.userId);

  if (!benefits) {
    errorResponse(res, 'NOT_FOUND', 'Member profile not found', 404);
    return;
  }

  successResponse(res, benefits);
});

export default router;
