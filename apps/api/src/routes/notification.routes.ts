import { Router } from 'express';
import { prisma } from '@ecommerce-hr/db';
import { paginationSchema, idParamSchema } from '@ecommerce-hr/shared';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validate, validateQuery, validateParams } from '../middleware/validate.js';
import { successResponse, paginatedResponse, errorResponse } from '../utils/api-response.js';
import type { AuthRequest } from '../middleware/auth.js';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
} from '../services/notification.service.js';

const router = Router();

router.use(authenticate);

const notificationQuerySchema = paginationSchema.extend({
  unreadOnly: z.coerce.boolean().optional(),
});

// GET / — list notifications for current user
router.get('/', validateQuery(notificationQuerySchema), async (req: AuthRequest, res) => {
  const { page, limit, unreadOnly } = res.locals.query as {
    page: number;
    limit: number;
    unreadOnly?: boolean;
  };

  const { notifications, total } = await getNotifications(
    req.user!.userId,
    page,
    limit,
    unreadOnly,
  );

  paginatedResponse(res, notifications, { page, limit, total });
});

// GET /unread-count — get unread count
router.get('/unread-count', async (req: AuthRequest, res) => {
  const count = await getUnreadCount(req.user!.userId);
  successResponse(res, { count });
});

// PATCH /:id/read — mark single as read
router.patch('/:id/read', validateParams(idParamSchema), async (req: AuthRequest, res) => {
  const notification = await markAsRead(req.params.id as string);
  successResponse(res, notification);
});

// PATCH /:id/unread — mark single as unread
router.patch('/:id/unread', validateParams(idParamSchema), async (req: AuthRequest, res) => {
  const notification = await prisma.notification.update({
    where: { id: req.params.id as string },
    data: { isRead: false },
  });
  successResponse(res, notification);
});

// DELETE /:id — delete a notification (own)
router.delete('/:id', validateParams(idParamSchema), async (req: AuthRequest, res) => {
  await prisma.notification.deleteMany({
    where: { id: req.params.id as string, userId: req.user!.userId },
  });
  successResponse(res, { message: 'Obavijest obrisana' });
});

// POST /mark-all-read — mark all as read for current user
router.post('/mark-all-read', async (req: AuthRequest, res) => {
  await markAllAsRead(req.user!.userId);
  successResponse(res, { message: 'All notifications marked as read' });
});

// ─── Push Token Endpoints ────────────────────────────────────────────────────

const pushTokenSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['ios', 'android']),
});

// POST /push-token — register push token for current user
router.post('/push-token', validate(pushTokenSchema), async (req: AuthRequest, res) => {
  const { token, platform } = req.body;

  await prisma.pushToken.upsert({
    where: { token },
    update: { userId: req.user!.userId, platform },
    create: { userId: req.user!.userId, token, platform },
  });

  successResponse(res, { message: 'Push token registered' });
});

// DELETE /push-token — unregister push token
router.delete('/push-token', async (req: AuthRequest, res) => {
  const token = req.query.token as string;
  if (!token) {
    errorResponse(res, 'BAD_REQUEST', 'Token parameter required', 400);
    return;
  }

  await prisma.pushToken.deleteMany({ where: { token } });
  successResponse(res, { message: 'Push token removed' });
});

export default router;
