import { Router } from 'express';
import { partnerQuerySchema, idParamSchema } from '@ecommerce-hr/shared';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { validateQuery, validateParams } from '../middleware/validate.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/api-response.js';
import { getActivePartners, getPartnerById } from '../services/partner.service.js';

const router = Router();

router.use(authenticate);

// GET / — active partners (paginated)
router.get('/', validateQuery(partnerQuerySchema), async (req: AuthRequest, res) => {
  const { page, limit } = res.locals.query as { page: number; limit: number };
  const { partners, total } = await getActivePartners(page, limit);
  paginatedResponse(res, partners, { page, limit, total });
});

// GET /:id — partner details
router.get('/:id', validateParams(idParamSchema), async (req: AuthRequest, res) => {
  const partner = await getPartnerById(req.params.id as string);
  if (!partner) {
    errorResponse(res, 'NOT_FOUND', 'Partner not found', 404);
    return;
  }
  successResponse(res, partner);
});

export default router;
