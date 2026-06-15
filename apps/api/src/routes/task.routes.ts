import { Router } from 'express';
import { z } from 'zod';
import {
  paginationSchema,
  idParamSchema,
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  taskFilterSchema,
} from '@ecommerce-hr/shared';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validate, validateQuery, validateParams } from '../middleware/validate.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/api-response.js';
import type { AuthRequest } from '../middleware/auth.js';
import { prisma } from '@ecommerce-hr/db';
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  getTaskStats,
  createTaskComment,
} from '../services/task.service.js';
import { createNotification } from '../services/notification.service.js';

async function getUserName(userId: string): Promise<string> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } });
  return u ? `${u.firstName} ${u.lastName}` : 'Nepoznato';
}

async function getNotifyTargets(task: { createdById: string | null; assignedToId: string | null }, excludeUserId: string): Promise<string[]> {
  const ids = new Set<string>();
  if (task.createdById) ids.add(task.createdById);
  if (task.assignedToId) ids.add(task.assignedToId);
  // Fallback: if no createdById, notify all OWNERs
  if (!task.createdById) {
    const owners = await prisma.user.findMany({ where: { role: 'OWNER', isActive: true }, select: { id: true } });
    for (const o of owners) ids.add(o.id);
  }
  ids.delete(excludeUserId);
  return Array.from(ids);
}

const router = Router();

const commentSchema = z.object({
  content: z.string().min(1).max(2000),
});

router.use(authenticate);
router.use(requireRole('OWNER', 'OPERATOR'));

// POST / — create task
router.post('/', validate(createTaskSchema), async (req: AuthRequest, res) => {
  const task = await createTask({
    ...req.body,
    createdById: req.user!.userId,
  });

  // Notify assignee
  if (task.assignedToId) {
    await createNotification({
      userId: task.assignedToId,
      type: 'ACTION',
      title: 'Novi zadatak',
      message: `Dodijeljen vam je zadatak: "${task.title}"`,
      actionUrl: `/tasks/${task.id}`,
    });
  }

  successResponse(res, task, 201);
});

// GET / — list tasks with filtering + pagination
router.get(
  '/',
  validateQuery(paginationSchema.merge(taskFilterSchema)),
  async (req: AuthRequest, res) => {
    const { page, limit, ...filters } = res.locals.query as {
      page: number;
      limit: number;
      status?: string;
      assignedToId?: string;
      priority?: string;
    };

    // OPERATOR only sees their own tasks
    if (req.user!.role === 'OPERATOR' && !filters.assignedToId) {
      filters.assignedToId = req.user!.userId;
    }

    const { tasks, total } = await getTasks(filters as Parameters<typeof getTasks>[0], page, limit);
    paginatedResponse(res, tasks, { page, limit, total });
  },
);

// GET /stats — task statistics
router.get('/stats', async (_req: AuthRequest, res) => {
  const stats = await getTaskStats();
  successResponse(res, stats);
});

// GET /:id — get single task (with comments)
router.get('/:id', validateParams(idParamSchema), async (req: AuthRequest, res) => {
  const task = await getTaskById(req.params.id as string);
  if (!task) {
    errorResponse(res, 'NOT_FOUND', 'Task not found', 404);
    return;
  }
  successResponse(res, task);
});

// PUT /:id — update task
router.put(
  '/:id',
  validateParams(idParamSchema),
  validate(updateTaskSchema),
  async (req: AuthRequest, res) => {
    const task = await updateTask(req.params.id as string, req.body);
    successResponse(res, task);
  },
);

// DELETE /:id — delete task
router.delete('/:id', validateParams(idParamSchema), async (req: AuthRequest, res) => {
  await deleteTask(req.params.id as string);
  successResponse(res, { message: 'Task deleted' });
});

// PATCH /:id/status — quick status update
router.patch(
  '/:id/status',
  validateParams(idParamSchema),
  validate(updateTaskStatusSchema),
  async (req: AuthRequest, res) => {
    const oldTask = await getTaskById(req.params.id as string);
    if (!oldTask) {
      errorResponse(res, 'NOT_FOUND', 'Task not found', 404);
      return;
    }

    const task = await updateTask(req.params.id as string, { status: req.body.status });

    // If OPERATOR accepts task (TODO → IN_PROGRESS), notify creator/OWNERs
    if (req.body.status === 'IN_PROGRESS' && oldTask.status === 'TODO') {
      const targets = await getNotifyTargets(oldTask, req.user!.userId);
      const userName = await getUserName(req.user!.userId);
      for (const targetId of targets) {
        await createNotification({
          userId: targetId,
          type: 'INFO',
          title: 'Zadatak preuzet',
          message: `${userName} je preuzeo/la zadatak: "${task.title}"`,
          actionUrl: `/tasks/${task.id}`,
        });
      }
    }

    // If task marked DONE, notify creator/OWNERs
    if (req.body.status === 'DONE' && oldTask.status !== 'DONE') {
      const targets = await getNotifyTargets(oldTask, req.user!.userId);
      const userName = await getUserName(req.user!.userId);
      for (const targetId of targets) {
        await createNotification({
          userId: targetId,
          type: 'INFO',
          title: 'Zadatak završen',
          message: `${userName} je završio/la zadatak: "${task.title}"`,
          actionUrl: `/tasks/${task.id}`,
        });
      }
    }

    successResponse(res, task);
  },
);

// POST /:id/comments — add comment to task
router.post(
  '/:id/comments',
  validateParams(idParamSchema),
  validate(commentSchema),
  async (req: AuthRequest, res) => {
    const task = await getTaskById(req.params.id as string);
    if (!task) {
      errorResponse(res, 'NOT_FOUND', 'Task not found', 404);
      return;
    }

    const comment = await createTaskComment({
      taskId: task.id,
      userId: req.user!.userId,
      content: req.body.content,
    });

    // Notify other participants (creator + assignee + OWNERs, excluding commenter)
    const targets = await getNotifyTargets(task, req.user!.userId);
    const userName = await getUserName(req.user!.userId);
    for (const targetId of targets) {
      await createNotification({
        userId: targetId,
        type: 'INFO',
        title: 'Novi komentar na zadatku',
        message: `${userName} je komentirao/la na "${task.title}": "${req.body.content.slice(0, 100)}"`,
        actionUrl: `/tasks/${task.id}`,
      });
    }

    successResponse(res, comment, 201);
  },
);

export default router;
