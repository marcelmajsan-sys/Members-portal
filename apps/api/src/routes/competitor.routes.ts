import { Router } from 'express';
import {
  createCompetitorSchema,
  updateCompetitorSchema,
  competitorQuerySchema,
  paginationSchema,
  idParamSchema,
} from '@ecommerce-hr/shared';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validate, validateQuery, validateParams } from '../middleware/validate.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/api-response.js';
import {
  createCompetitor,
  getCompetitors,
  getCompetitorById,
  updateCompetitor,
  deleteCompetitor,
  scanCompetitor,
  getCompetitorScans,
} from '../services/competitor.service.js';
import {
  createScanSchedule,
  getScanSchedules,
  deleteScanSchedule,
  runStaleScanSchedules,
} from '../services/price-monitor.service.js';

const router = Router();

router.use(authenticate);

// POST / — create competitor (OWNER/OPERATOR)
router.post(
  '/',
  requireRole('OWNER', 'OPERATOR', 'MEMBER'),
  validate(createCompetitorSchema),
  async (req: AuthRequest, res) => {
    const competitor = await createCompetitor(req.body);
    successResponse(res, competitor, 201);
  },
);

// GET / — list competitors (paginated, filter by industry)
router.get('/', validateQuery(competitorQuerySchema), async (req: AuthRequest, res) => {
  const { page, limit, ...filters } = res.locals.query as {
    page: number;
    limit: number;
    industry?: string;
  };

  const { competitors, total } = await getCompetitors(filters, page, limit);
  paginatedResponse(res, competitors, { page, limit, total });
});

// GET /:id — competitor details with scan history
router.get('/:id', validateParams(idParamSchema), async (req: AuthRequest, res) => {
  const competitor = await getCompetitorById(req.params.id as string);
  if (!competitor) {
    errorResponse(res, 'NOT_FOUND', 'Competitor not found', 404);
    return;
  }
  successResponse(res, competitor);
});

// PUT /:id — update competitor (OWNER/OPERATOR)
router.put(
  '/:id',
  requireRole('OWNER', 'OPERATOR', 'MEMBER'),
  validateParams(idParamSchema),
  validate(updateCompetitorSchema),
  async (req: AuthRequest, res) => {
    const competitor = await updateCompetitor(req.params.id as string, req.body);
    successResponse(res, competitor);
  },
);

// DELETE /:id — soft delete (OWNER/OPERATOR)
router.delete(
  '/:id',
  requireRole('OWNER', 'OPERATOR', 'MEMBER'),
  validateParams(idParamSchema),
  async (req: AuthRequest, res) => {
    await deleteCompetitor(req.params.id as string);
    successResponse(res, { message: 'Competitor deactivated' });
  },
);

// POST /:id/scan — AI scan (OWNER/OPERATOR)
router.post(
  '/:id/scan',
  requireRole('OWNER', 'OPERATOR', 'MEMBER'),
  validateParams(idParamSchema),
  async (req: AuthRequest, res) => {
    try {
      const scan = await scanCompetitor(req.params.id as string);
      successResponse(res, scan, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Competitor scan failed';
      errorResponse(res, 'SCAN_FAILED', message, 500);
    }
  },
);

// GET /:id/scans — scan history (paginated)
router.get(
  '/:id/scans',
  validateParams(idParamSchema),
  validateQuery(paginationSchema),
  async (req: AuthRequest, res) => {
    const { page, limit } = res.locals.query as { page: number; limit: number };
    const { scans, total } = await getCompetitorScans(req.params.id as string, page, limit);
    paginatedResponse(res, scans, { page, limit, total });
  },
);

// POST /:id/schedules — create/enable auto-scan schedule
router.post(
  '/:id/schedules',
  requireRole('OWNER', 'OPERATOR', 'MEMBER'),
  validateParams(idParamSchema),
  async (req: AuthRequest, res) => {
    try {
      const { categoryUrl, frequency } = req.body;
      if (!categoryUrl) {
        errorResponse(res, 'INVALID_INPUT', 'Category URL is required', 400);
        return;
      }
      const schedule = await createScanSchedule(req.params.id as string, categoryUrl, frequency);
      successResponse(res, schedule, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create schedule';
      errorResponse(res, 'CREATE_FAILED', message, 500);
    }
  },
);

// GET /:id/schedules — list schedules for competitor
router.get('/:id/schedules', validateParams(idParamSchema), async (req: AuthRequest, res) => {
  const schedules = await getScanSchedules(req.params.id as string);
  successResponse(res, schedules);
});

// DELETE /schedules/:id — disable schedule
router.delete(
  '/schedules/:id',
  requireRole('OWNER', 'OPERATOR', 'MEMBER'),
  validateParams(idParamSchema),
  async (req: AuthRequest, res) => {
    try {
      await deleteScanSchedule(req.params.id as string);
      successResponse(res, { message: 'Schedule disabled' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete schedule';
      errorResponse(res, 'DELETE_FAILED', message, 500);
    }
  },
);

// POST /auto-scan — run all stale scan schedules (lazy approach)
router.post(
  '/auto-scan',
  requireRole('OWNER', 'OPERATOR', 'MEMBER'),
  async (_req: AuthRequest, res) => {
    try {
      const result = await runStaleScanSchedules();
      successResponse(res, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Auto-scan failed';
      errorResponse(res, 'AUTO_SCAN_FAILED', message, 500);
    }
  },
);

export default router;
