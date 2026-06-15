import { Router } from 'express';
import {
  paginationSchema,
  idParamSchema,
  enrollModuleSchema,
  updateProgressSchema,
  submitExamSchema,
  mentorQuestionSchema,
} from '@ecommerce-hr/shared';
import { authenticate } from '../middleware/auth.js';
import { validate, validateQuery, validateParams } from '../middleware/validate.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/api-response.js';
import type { AuthRequest } from '../middleware/auth.js';
import { prisma } from '@ecommerce-hr/db';
import {
  getModules,
  getModuleById,
  enrollMember,
  updateProgress,
  getEnrollments,
  submitExam,
  getCertificates,
  mentorChat,
} from '../services/academy.service.js';

const router = Router();

router.use(authenticate);

// GET /modules — list published modules
router.get('/modules', validateQuery(paginationSchema), async (req: AuthRequest, res) => {
  const { page, limit } = res.locals.query as { page: number; limit: number };
  const { modules, total } = await getModules(page, limit);
  paginatedResponse(res, modules, { page, limit, total });
});

// GET /modules/:id — get single module
router.get('/modules/:id', validateParams(idParamSchema), async (req: AuthRequest, res) => {
  const mod = await getModuleById(req.params.id as string);
  if (!mod) {
    errorResponse(res, 'NOT_FOUND', 'Module not found', 404);
    return;
  }
  successResponse(res, mod);
});

// POST /enroll — enroll in module
router.post('/enroll', validate(enrollModuleSchema), async (req: AuthRequest, res) => {
  const member = await prisma.member.findFirst({ where: { userId: req.user!.userId } });
  if (!member) {
    errorResponse(res, 'NOT_FOUND', 'Member not found', 404);
    return;
  }
  const enrollment = await enrollMember(member.id, req.body.moduleId);
  successResponse(res, enrollment, 201);
});

// GET /enrollments — get user's enrollments
router.get('/enrollments', async (req: AuthRequest, res) => {
  const member = await prisma.member.findFirst({ where: { userId: req.user!.userId } });
  if (!member) {
    errorResponse(res, 'NOT_FOUND', 'Member not found', 404);
    return;
  }
  const enrollments = await getEnrollments(member.id);
  successResponse(res, enrollments);
});

// PATCH /enrollments/:id/progress — update progress
router.patch(
  '/enrollments/:id/progress',
  validateParams(idParamSchema),
  validate(updateProgressSchema),
  async (req: AuthRequest, res) => {
    const member = await prisma.member.findFirst({ where: { userId: req.user!.userId } });
    if (!member) {
      errorResponse(res, 'NOT_FOUND', 'Member not found', 404);
      return;
    }
    try {
      const enrollment = await updateProgress(member.id, req.params.id as string, req.body.progress);
      successResponse(res, enrollment);
    } catch {
      errorResponse(res, 'NOT_FOUND', 'Enrollment not found', 404);
    }
  },
);

// POST /exams/submit — submit exam answers
router.post('/exams/submit', validate(submitExamSchema), async (req: AuthRequest, res) => {
  const member = await prisma.member.findFirst({ where: { userId: req.user!.userId } });
  if (!member) {
    errorResponse(res, 'NOT_FOUND', 'Member not found', 404);
    return;
  }
  try {
    const result = await submitExam(member.id, req.body.examId, req.body.answers);
    successResponse(res, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Exam submission failed';
    errorResponse(res, 'EXAM_FAILED', message, 400);
  }
});

// GET /certificates — get user's certificates
router.get('/certificates', async (req: AuthRequest, res) => {
  const member = await prisma.member.findFirst({ where: { userId: req.user!.userId } });
  if (!member) {
    errorResponse(res, 'NOT_FOUND', 'Member not found', 404);
    return;
  }
  const certificates = await getCertificates(member.id);
  successResponse(res, certificates);
});

// POST /mentor — ask AI mentor
router.post('/mentor', validate(mentorQuestionSchema), async (req: AuthRequest, res) => {
  try {
    const response = await mentorChat(req.body.question, req.body.moduleId);
    successResponse(res, response);
  } catch {
    errorResponse(res, 'MENTOR_ERROR', 'AI mentor is temporarily unavailable', 500);
  }
});

export default router;
