import { Router } from 'express';
import { runAuditSchema, paginationSchema, idParamSchema } from '@ecommerce-hr/shared';
import { validate, validateQuery, validateParams } from '../middleware/validate.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/api-response.js';
import { runAudit, getAuditById, getAudits } from '../services/audit.service.js';

const router = Router();

// POST / — run AI audit (public)
router.post('/', validate(runAuditSchema), async (req, res) => {
  try {
    const report = await runAudit(req.body.websiteUrl);
    successResponse(res, report, 201);
  } catch {
    errorResponse(res, 'AUDIT_FAILED', 'Failed to generate audit report', 500);
  }
});

// GET / — list audits
router.get('/', validateQuery(paginationSchema), async (req, res) => {
  const { page, limit } = res.locals.query as { page: number; limit: number };
  const { audits, total } = await getAudits(page, limit);
  paginatedResponse(res, audits, { page, limit, total });
});

// GET /:id — get single audit
router.get('/:id', validateParams(idParamSchema), async (req, res) => {
  const audit = await getAuditById(req.params.id as string);
  if (!audit) {
    errorResponse(res, 'NOT_FOUND', 'Audit report not found', 404);
    return;
  }
  successResponse(res, audit);
});

export default router;
