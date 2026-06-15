import { Router } from 'express';
import {
  createSequenceSchema,
  updateSequenceSchema,
  updateSequenceStatusSchema,
  paginationSchema,
  idParamSchema,
} from '@ecommerce-hr/shared';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validate, validateQuery, validateParams } from '../middleware/validate.js';
import { successResponse, paginatedResponse, errorResponse } from '../utils/api-response.js';
import {
  getSequences,
  getSequenceById,
  createSequence,
  updateSequence,
  updateSequenceStatus,
  getSequenceLogs,
} from '../services/sequence.service.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('OWNER', 'OPERATOR'));

// GET / — list all sequences
router.get('/', validateQuery(paginationSchema), async (req, res) => {
  const { page, limit } = res.locals.query as { page: number; limit: number };
  const { sequences, total } = await getSequences(page, limit);
  paginatedResponse(res, sequences, { page, limit, total });
});

// GET /:id — get single sequence
router.get('/:id', validateParams(idParamSchema), async (req, res) => {
  const sequence = await getSequenceById(req.params.id as string);

  if (!sequence) {
    errorResponse(res, 'NOT_FOUND', 'Sequence not found', 404);
    return;
  }

  successResponse(res, sequence);
});

// POST / — create sequence
router.post('/', validate(createSequenceSchema), async (req, res) => {
  const sequence = await createSequence(req.body);
  successResponse(res, sequence, 201);
});

// PUT /:id — update sequence
router.put('/:id', validateParams(idParamSchema), validate(updateSequenceSchema), async (req, res) => {
  const existing = await getSequenceById(req.params.id as string);

  if (!existing) {
    errorResponse(res, 'NOT_FOUND', 'Sequence not found', 404);
    return;
  }

  const sequence = await updateSequence(req.params.id as string, req.body);
  successResponse(res, sequence);
});

// PATCH /:id/status — activate/pause sequence
router.patch('/:id/status', validateParams(idParamSchema), validate(updateSequenceStatusSchema), async (req, res) => {
  const existing = await getSequenceById(req.params.id as string);

  if (!existing) {
    errorResponse(res, 'NOT_FOUND', 'Sequence not found', 404);
    return;
  }

  const sequence = await updateSequenceStatus(req.params.id as string, req.body.status);
  successResponse(res, sequence);
});

// GET /:id/logs — get automation logs for a sequence
router.get('/:id/logs', validateParams(idParamSchema), validateQuery(paginationSchema), async (req, res) => {
  const existing = await getSequenceById(req.params.id as string);

  if (!existing) {
    errorResponse(res, 'NOT_FOUND', 'Sequence not found', 404);
    return;
  }

  const { page, limit } = res.locals.query as { page: number; limit: number };
  const { logs, total } = await getSequenceLogs(req.params.id as string, page, limit);
  paginatedResponse(res, logs, { page, limit, total });
});

export default router;
