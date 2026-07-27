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
  getSequenceAnalytics,
} from '../services/sequence.service.js';
import { testSequenceEmail } from '../services/automation-executor.js';
import { z } from 'zod';

const router = Router();

router.use(authenticate);
router.use(requireRole('OWNER', 'OPERATOR'));

// GET / — list all sequences
router.get('/', validateQuery(paginationSchema), async (req, res) => {
  const { page, limit } = res.locals.query as { page: number; limit: number };
  const { sequences, total } = await getSequences(page, limit);
  paginatedResponse(res, sequences, { page, limit, total });
});

// GET /analytics — analitika svih automatizacija (audience + povijest slanja + predlošci).
// MORA biti prije '/:id' inače bi ga idParamSchema (cuid) presrela i vratila 400. OWNER-only.
router.get('/analytics', requireRole('OWNER'), async (_req, res) => {
  const data = await getSequenceAnalytics();
  successResponse(res, data);
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

// POST /:id/test — pošalji testni email sekvence na zadani email (preskače uvjete/cooldown)
const testSequenceSchema = z.object({ email: z.string().email('Neispravna email adresa') });
router.post('/:id/test', requireRole('OWNER'), validateParams(idParamSchema), validate(testSequenceSchema), async (req, res) => {
  const result = await testSequenceEmail(req.params.id as string, req.body.email);
  if ('error' in result) {
    const messages: Record<string, [string, number]> = {
      SEQUENCE_NOT_FOUND: ['Automatizacija nije pronađena', 404],
      MEMBER_NOT_FOUND: ['Član s tim emailom nije pronađen', 404],
      NO_EMAIL_STEPS: ['Automatizacija nema email korake', 400],
    };
    const [msg, code] = messages[result.error];
    errorResponse(res, result.error, msg, code);
    return;
  }
  successResponse(res, { sent: result.sent, to: req.body.email });
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
