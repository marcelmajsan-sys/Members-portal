import { Router } from 'express';
import {
  createMarketIntelligenceSchema,
  updateMarketIntelligenceSchema,
  marketIntelligenceQuerySchema,
  idParamSchema,
} from '@ecommerce-hr/shared';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validate, validateQuery, validateParams } from '../middleware/validate.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/api-response.js';
import {
  createMarketIntelligence,
  getMarketIntelligence,
  getMarketIntelligenceById,
  updateMarketIntelligence,
  deleteMarketIntelligence,
} from '../services/market-intelligence.service.js';

const router = Router();

router.use(authenticate);

// POST / — create market intelligence (OWNER/OPERATOR)
router.post(
  '/',
  requireRole('OWNER', 'OPERATOR'),
  validate(createMarketIntelligenceSchema),
  async (req: AuthRequest, res) => {
    const intel = await createMarketIntelligence(req.body);
    successResponse(res, intel, 201);
  },
);

// GET / — feed (paginated, filter by category)
router.get('/', validateQuery(marketIntelligenceQuerySchema), async (req: AuthRequest, res) => {
  const { page, limit, ...filters } = res.locals.query as {
    page: number;
    limit: number;
    category?: string;
  };

  const { items, total } = await getMarketIntelligence(filters, page, limit);
  paginatedResponse(res, items, { page, limit, total });
});

// GET /:id — details
router.get('/:id', validateParams(idParamSchema), async (req: AuthRequest, res) => {
  const intel = await getMarketIntelligenceById(req.params.id as string);
  if (!intel) {
    errorResponse(res, 'NOT_FOUND', 'Market intelligence not found', 404);
    return;
  }
  successResponse(res, intel);
});

// PUT /:id — update (OWNER/OPERATOR)
router.put(
  '/:id',
  requireRole('OWNER', 'OPERATOR'),
  validateParams(idParamSchema),
  validate(updateMarketIntelligenceSchema),
  async (req: AuthRequest, res) => {
    const intel = await updateMarketIntelligence(req.params.id as string, req.body);
    successResponse(res, intel);
  },
);

// DELETE /:id — delete (OWNER/OPERATOR)
router.delete(
  '/:id',
  requireRole('OWNER', 'OPERATOR'),
  validateParams(idParamSchema),
  async (req: AuthRequest, res) => {
    await deleteMarketIntelligence(req.params.id as string);
    successResponse(res, { message: 'Market intelligence deleted' });
  },
);

export default router;
