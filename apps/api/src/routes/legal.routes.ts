import { Router } from 'express';
import { submitLegalQuerySchema, paginationSchema, idParamSchema } from '@ecommerce-hr/shared';
import { authenticate } from '../middleware/auth.js';
import { validate, validateQuery, validateParams } from '../middleware/validate.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/api-response.js';
import type { AuthRequest } from '../middleware/auth.js';
import { prisma } from '@ecommerce-hr/db';
import { submitQuery, getQueryById, getQueries } from '../services/legal.service.js';

const router = Router();

router.use(authenticate);

// POST /queries — submit legal question
router.post('/queries', validate(submitLegalQuerySchema), async (req: AuthRequest, res) => {
  const member = await prisma.member.findFirst({ where: { userId: req.user!.userId } });
  try {
    const query = await submitQuery(req.body.question, req.body.category, member?.id);
    successResponse(res, query, 201);
  } catch {
    errorResponse(res, 'LEGAL_ERROR', 'Failed to process legal query', 500);
  }
});

// GET /queries — list queries
router.get('/queries', validateQuery(paginationSchema), async (req: AuthRequest, res) => {
  const { page, limit } = res.locals.query as { page: number; limit: number };
  const role = req.user!.role;

  if (role === 'OWNER' || role === 'OPERATOR') {
    const { queries, total } = await getQueries(page, limit);
    paginatedResponse(res, queries, { page, limit, total });
  } else {
    const member = await prisma.member.findFirst({ where: { userId: req.user!.userId } });
    if (!member) {
      errorResponse(res, 'NOT_FOUND', 'Member not found', 404);
      return;
    }
    const { queries, total } = await getQueries(page, limit, member.id);
    paginatedResponse(res, queries, { page, limit, total });
  }
});

// GET /queries/:id — get single query
router.get('/queries/:id', validateParams(idParamSchema), async (req: AuthRequest, res) => {
  const query = await getQueryById(req.params.id as string);
  if (!query) {
    errorResponse(res, 'NOT_FOUND', 'Legal query not found', 404);
    return;
  }
  successResponse(res, query);
});

export default router;
