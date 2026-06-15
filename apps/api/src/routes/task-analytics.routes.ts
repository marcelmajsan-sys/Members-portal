import { Router } from 'express';
import { idParamSchema } from '@ecommerce-hr/shared';
import { prisma } from '@ecommerce-hr/db';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validateParams } from '../middleware/validate.js';
import { successResponse, errorResponse } from '../utils/api-response.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('OWNER'));

// GET /team — Team performance overview
router.get('/team', async (_req: AuthRequest, res) => {
  const operators = await prisma.user.findMany({
    where: { role: 'OPERATOR' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const totals = { todo: 0, inProgress: 0, done: 0, overdue: 0, total: 0 };

  const employees = await Promise.all(
    operators.map(async (op) => {
      const [todo, inProgress, done, overdue, completedThisWeek, completedThisMonth, doneTasks] =
        await Promise.all([
          prisma.task.count({ where: { assignedToId: op.id, status: 'TODO' } }),
          prisma.task.count({ where: { assignedToId: op.id, status: 'IN_PROGRESS' } }),
          prisma.task.count({ where: { assignedToId: op.id, status: 'DONE' } }),
          prisma.task.count({
            where: {
              assignedToId: op.id,
              dueAt: { lt: now },
              status: { not: 'DONE' },
            },
          }),
          prisma.task.count({
            where: {
              assignedToId: op.id,
              status: 'DONE',
              completedAt: { gte: startOfWeek },
            },
          }),
          prisma.task.count({
            where: {
              assignedToId: op.id,
              status: 'DONE',
              completedAt: { gte: startOfMonth },
            },
          }),
          prisma.task.findMany({
            where: {
              assignedToId: op.id,
              status: 'DONE',
              completedAt: { not: null },
            },
            select: { createdAt: true, completedAt: true },
          }),
        ]);

      const total = todo + inProgress + done;
      totals.todo += todo;
      totals.inProgress += inProgress;
      totals.done += done;
      totals.overdue += overdue;
      totals.total += total;

      let avgCompletionDays = 0;
      if (doneTasks.length > 0) {
        const totalDays = doneTasks.reduce((sum, t) => {
          const diff = (t.completedAt!.getTime() - t.createdAt.getTime()) / (1000 * 60 * 60 * 24);
          return sum + diff;
        }, 0);
        avgCompletionDays = Math.round((totalDays / doneTasks.length) * 10) / 10;
      }

      return {
        id: op.id,
        firstName: op.firstName,
        lastName: op.lastName,
        email: op.email,
        stats: { todo, inProgress, done, overdue, total },
        avgCompletionDays,
        completedThisWeek,
        completedThisMonth,
      };
    }),
  );

  successResponse(res, { employees, totals });
});

// GET /user/:id — Individual employee analytics
router.get('/user/:id', validateParams(idParamSchema), async (req: AuthRequest, res) => {
  const userId = req.params.id as string;

  const user = await prisma.user.findUnique({
    where: { id: userId, role: 'OPERATOR' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  });

  if (!user) {
    errorResponse(res, 'NOT_FOUND', 'Employee not found', 404);
    return;
  }

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [todo, inProgress, done, overdue, completedThisWeek, completedThisMonth, recentCompleted, doneTasks] =
    await Promise.all([
      prisma.task.count({ where: { assignedToId: userId, status: 'TODO' } }),
      prisma.task.count({ where: { assignedToId: userId, status: 'IN_PROGRESS' } }),
      prisma.task.count({ where: { assignedToId: userId, status: 'DONE' } }),
      prisma.task.count({
        where: {
          assignedToId: userId,
          dueAt: { lt: now },
          status: { not: 'DONE' },
        },
      }),
      prisma.task.count({
        where: {
          assignedToId: userId,
          status: 'DONE',
          completedAt: { gte: startOfWeek },
        },
      }),
      prisma.task.count({
        where: {
          assignedToId: userId,
          status: 'DONE',
          completedAt: { gte: startOfMonth },
        },
      }),
      prisma.task.findMany({
        where: {
          assignedToId: userId,
          status: 'DONE',
        },
        orderBy: { completedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          title: true,
          priority: true,
          createdAt: true,
          completedAt: true,
        },
      }),
      prisma.task.findMany({
        where: {
          assignedToId: userId,
          status: 'DONE',
          completedAt: { not: null },
        },
        select: { createdAt: true, completedAt: true },
      }),
    ]);

  let avgCompletionDays = 0;
  if (doneTasks.length > 0) {
    const totalDays = doneTasks.reduce((sum, t) => {
      const diff = (t.completedAt!.getTime() - t.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      return sum + diff;
    }, 0);
    avgCompletionDays = Math.round((totalDays / doneTasks.length) * 10) / 10;
  }

  successResponse(res, {
    ...user,
    stats: { todo, inProgress, done, overdue, total: todo + inProgress + done },
    avgCompletionDays,
    completedThisWeek,
    completedThisMonth,
    recentCompleted,
  });
});

export default router;
