import { Router } from 'express';
import { paginationSchema, idParamSchema } from '@ecommerce-hr/shared';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { validateQuery, validateParams } from '../middleware/validate.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/api-response.js';
import { getMemberByUserId } from '../services/member.service.js';
import {
  createMemberProduct,
  getMemberProducts,
  updateMemberProduct,
  deleteMemberProduct,
  getProductComparison,
} from '../services/member-product.service.js';

const router = Router();

router.use(authenticate);

// Helper to get memberId from userId
async function getMemberId(req: AuthRequest): Promise<string | null> {
  const member = await getMemberByUserId(req.user!.userId);
  return member ? (member as { id: string }).id : null;
}

// POST / — add product
router.post('/', async (req: AuthRequest, res) => {
  try {
    const memberId = await getMemberId(req);
    if (!memberId) { errorResponse(res, 'NOT_FOUND', 'Member not found', 404); return; }

    const { name, price, currency, category, productUrl } = req.body;
    if (!name || price === undefined) {
      errorResponse(res, 'INVALID_INPUT', 'Name and price are required', 400);
      return;
    }

    const product = await createMemberProduct(memberId, { name, price: Number(price), currency, category, productUrl });
    successResponse(res, product, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create product';
    errorResponse(res, 'CREATE_FAILED', message, 500);
  }
});

// GET / — list products
router.get('/', validateQuery(paginationSchema), async (req: AuthRequest, res) => {
  const memberId = await getMemberId(req);
  if (!memberId) { errorResponse(res, 'NOT_FOUND', 'Member not found', 404); return; }

  const { page, limit } = res.locals.query as { page: number; limit: number };
  const { products, total } = await getMemberProducts(memberId, page, limit);
  paginatedResponse(res, products, { page, limit, total });
});

// PUT /:id — update product
router.put('/:id', validateParams(idParamSchema), async (req: AuthRequest, res) => {
  try {
    const memberId = await getMemberId(req);
    if (!memberId) { errorResponse(res, 'NOT_FOUND', 'Member not found', 404); return; }

    const product = await updateMemberProduct(req.params.id as string, memberId, req.body);
    successResponse(res, product);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update product';
    errorResponse(res, 'UPDATE_FAILED', message, 500);
  }
});

// DELETE /:id — deactivate product
router.delete('/:id', validateParams(idParamSchema), async (req: AuthRequest, res) => {
  try {
    const memberId = await getMemberId(req);
    if (!memberId) { errorResponse(res, 'NOT_FOUND', 'Member not found', 404); return; }

    await deleteMemberProduct(req.params.id as string, memberId);
    successResponse(res, { message: 'Product deactivated' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete product';
    errorResponse(res, 'DELETE_FAILED', message, 500);
  }
});

// GET /comparison — compare with competitor prices
router.get('/comparison', async (req: AuthRequest, res) => {
  try {
    const memberId = await getMemberId(req);
    if (!memberId) { errorResponse(res, 'NOT_FOUND', 'Member not found', 404); return; }

    const comparison = await getProductComparison(memberId);
    successResponse(res, comparison);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get comparison';
    errorResponse(res, 'COMPARISON_FAILED', message, 500);
  }
});

export default router;
