import { Router } from 'express';
import { paginationSchema, idParamSchema } from '@ecommerce-hr/shared';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validateQuery, validateParams } from '../middleware/validate.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/api-response.js';
import { getMemberByUserId } from '../services/member.service.js';
import {
  scanPrices,
  getPriceSnapshots,
  getLatestPriceSnapshot,
  getPriceAlertsSummary,
  getMemberPriceAlerts,
  getPriceAlertsSummaryForMember,
  markAlertAsRead,
  getPriceHistory,
} from '../services/price-monitor.service.js';

const router = Router();

router.use(authenticate);

// GET /prices/summary — price alerts summary across all competitors
router.get('/prices/summary', async (_req: AuthRequest, res) => {
  const alerts = await getPriceAlertsSummary();
  successResponse(res, alerts);
});

// GET /prices/alerts — list price alerts for current member
router.get('/prices/alerts', validateQuery(paginationSchema), async (req: AuthRequest, res) => {
  try {
    const member = await getMemberByUserId(req.user!.userId);
    const memberId = member ? (member as { id: string }).id : null;
    const { page, limit } = res.locals.query as { page: number; limit: number };
    const alertType = req.query.alertType as string | undefined;
    const competitorId = req.query.competitorId as string | undefined;
    const isRead = req.query.isRead !== undefined ? req.query.isRead === 'true' : undefined;

    const { alerts, total } = await getMemberPriceAlerts(memberId, page, limit, { alertType, competitorId, isRead });
    paginatedResponse(res, alerts, { page, limit, total });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get alerts';
    errorResponse(res, 'ALERTS_FAILED', message, 500);
  }
});

// GET /prices/alerts/summary — alert summary for current member
router.get('/prices/alerts/summary', async (req: AuthRequest, res) => {
  try {
    const member = await getMemberByUserId(req.user!.userId);
    const memberId = member ? (member as { id: string }).id : null;
    const summary = await getPriceAlertsSummaryForMember(memberId);
    successResponse(res, summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get summary';
    errorResponse(res, 'SUMMARY_FAILED', message, 500);
  }
});

// PATCH /prices/alerts/:id/read — mark alert as read
router.patch('/prices/alerts/:id/read', validateParams(idParamSchema), async (req: AuthRequest, res) => {
  try {
    const alert = await markAlertAsRead(req.params.id as string);
    successResponse(res, alert);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to mark as read';
    errorResponse(res, 'UPDATE_FAILED', message, 500);
  }
});

// POST /:id/prices/scan — trigger price scan for a competitor category
router.post(
  '/:id/prices/scan',
  requireRole('OWNER', 'OPERATOR', 'MEMBER'),
  validateParams(idParamSchema),
  async (req: AuthRequest, res) => {
    try {
      const { html, categoryUrl } = req.body ?? {};
      if (!html || typeof html !== 'string' || html.length < 100) {
        errorResponse(res, 'INVALID_INPUT', 'HTML content is required.', 400);
        return;
      }
      if (!categoryUrl || typeof categoryUrl !== 'string') {
        errorResponse(res, 'INVALID_INPUT', 'Category URL is required.', 400);
        return;
      }
      const snapshot = await scanPrices(req.params.id as string, categoryUrl, html);
      successResponse(res, snapshot, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Price scan failed';
      errorResponse(res, 'PRICE_SCAN_FAILED', message, 500);
    }
  },
);

// GET /:id/prices — price snapshot history (paginated, optional categoryUrl filter)
router.get(
  '/:id/prices',
  validateParams(idParamSchema),
  validateQuery(paginationSchema),
  async (req: AuthRequest, res) => {
    const { page, limit } = res.locals.query as { page: number; limit: number };
    const categoryUrl = req.query.categoryUrl as string | undefined;
    const { snapshots, total } = await getPriceSnapshots(req.params.id as string, page, limit, categoryUrl);
    paginatedResponse(res, snapshots, { page, limit, total });
  },
);

// GET /:id/prices/latest — latest price snapshot (optional categoryUrl filter)
router.get(
  '/:id/prices/latest',
  validateParams(idParamSchema),
  async (req: AuthRequest, res) => {
    const categoryUrl = req.query.categoryUrl as string | undefined;
    const snapshot = await getLatestPriceSnapshot(req.params.id as string, categoryUrl);
    if (!snapshot) {
      errorResponse(res, 'NOT_FOUND', 'No price snapshots found', 404);
      return;
    }
    successResponse(res, snapshot);
  },
);

// GET /:id/prices/history — price history for trend chart
router.get(
  '/:id/prices/history',
  validateParams(idParamSchema),
  async (req: AuthRequest, res) => {
    try {
      const productName = req.query.productName as string | undefined;
      const categoryUrl = req.query.categoryUrl as string | undefined;
      const history = await getPriceHistory(req.params.id as string, productName, categoryUrl);
      successResponse(res, history);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get history';
      errorResponse(res, 'HISTORY_FAILED', message, 500);
    }
  },
);

export default router;
