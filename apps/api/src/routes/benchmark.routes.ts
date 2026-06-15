import { Router } from 'express';
import {
  createBenchmarkSchema,
  updateBenchmarkSchema,
  benchmarkQuerySchema,
  idParamSchema,
} from '@ecommerce-hr/shared';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validate, validateQuery, validateParams } from '../middleware/validate.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/api-response.js';
import {
  createBenchmark,
  getBenchmarks,
  getBenchmarkById,
  updateBenchmark,
  deleteBenchmark,
  getBenchmarkCategories,
} from '../services/benchmark.service.js';

const router = Router();

router.use(authenticate);

// POST / — add benchmark (OWNER/OPERATOR)
router.post(
  '/',
  requireRole('OWNER', 'OPERATOR'),
  validate(createBenchmarkSchema),
  async (req: AuthRequest, res) => {
    const benchmark = await createBenchmark(req.body);
    successResponse(res, benchmark, 201);
  },
);

// GET / — list benchmarks (paginated, filter by category/period/region)
router.get('/', validateQuery(benchmarkQuerySchema), async (req: AuthRequest, res) => {
  const { page, limit, ...filters } = res.locals.query as {
    page: number;
    limit: number;
    category?: string;
    period?: string;
    region?: string;
  };

  const { benchmarks, total } = await getBenchmarks(filters, page, limit);
  paginatedResponse(res, benchmarks, { page, limit, total });
});

// GET /categories — distinct categories
router.get('/categories', async (_req: AuthRequest, res) => {
  const categories = await getBenchmarkCategories();
  successResponse(res, categories);
});

// GET /:id — details
router.get('/:id', validateParams(idParamSchema), async (req: AuthRequest, res) => {
  const benchmark = await getBenchmarkById(req.params.id as string);
  if (!benchmark) {
    errorResponse(res, 'NOT_FOUND', 'Benchmark not found', 404);
    return;
  }
  successResponse(res, benchmark);
});

// PUT /:id — update (OWNER/OPERATOR)
router.put(
  '/:id',
  requireRole('OWNER', 'OPERATOR'),
  validateParams(idParamSchema),
  validate(updateBenchmarkSchema),
  async (req: AuthRequest, res) => {
    const benchmark = await updateBenchmark(req.params.id as string, req.body);
    successResponse(res, benchmark);
  },
);

// DELETE /:id — delete (OWNER/OPERATOR)
router.delete(
  '/:id',
  requireRole('OWNER', 'OPERATOR'),
  validateParams(idParamSchema),
  async (req: AuthRequest, res) => {
    await deleteBenchmark(req.params.id as string);
    successResponse(res, { message: 'Benchmark deleted' });
  },
);

export default router;
