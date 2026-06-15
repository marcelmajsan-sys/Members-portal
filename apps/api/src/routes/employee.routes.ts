import { Router } from 'express';
import { idParamSchema } from '@ecommerce-hr/shared';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validateParams } from '../middleware/validate.js';
import { successResponse, errorResponse } from '../utils/api-response.js';
import type { AuthRequest } from '../middleware/auth.js';
import {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deactivateEmployee,
  changeEmployeePassword,
} from '../services/employee.service.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('OWNER'));

// POST / — Create employee (OPERATOR user)
router.post('/', async (req: AuthRequest, res) => {
  const { email, password, firstName, lastName } = req.body as {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  };

  if (!email || !password || !firstName || !lastName) {
    errorResponse(res, 'VALIDATION_ERROR', 'email, password, firstName, and lastName are required', 400);
    return;
  }

  try {
    const employee = await createEmployee({ email, password, firstName, lastName });
    successResponse(res, employee, 201);
  } catch {
    errorResponse(res, 'CONFLICT', 'User with this email already exists', 409);
  }
});

// GET / — List all employees (OPERATOR users)
router.get('/', async (_req: AuthRequest, res) => {
  const employees = await getEmployees();
  successResponse(res, employees);
});

// GET /:id — Get employee detail with task stats
router.get('/:id', validateParams(idParamSchema), async (req: AuthRequest, res) => {
  const employee = await getEmployeeById(req.params.id as string);
  if (!employee) {
    errorResponse(res, 'NOT_FOUND', 'Employee not found', 404);
    return;
  }
  successResponse(res, employee);
});

// PATCH /:id — Update employee
router.patch('/:id', validateParams(idParamSchema), async (req: AuthRequest, res) => {
  const { firstName, lastName, email, role, isActive } = req.body as {
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: 'OPERATOR' | 'OWNER';
    isActive?: boolean;
  };

  if (role && !['OPERATOR', 'OWNER'].includes(role)) {
    errorResponse(res, 'VALIDATION_ERROR', 'Role must be OPERATOR or OWNER', 400);
    return;
  }

  try {
    const employee = await updateEmployee(req.params.id as string, { firstName, lastName, email, role, isActive });
    successResponse(res, employee);
  } catch {
    errorResponse(res, 'NOT_FOUND', 'Employee not found', 404);
  }
});

// PATCH /:id/password — Change employee password
router.patch('/:id/password', validateParams(idParamSchema), async (req: AuthRequest, res) => {
  const { password } = req.body as { password?: string };
  if (!password || password.length < 6) {
    errorResponse(res, 'VALIDATION_ERROR', 'Lozinka mora imati najmanje 6 znakova', 400);
    return;
  }

  try {
    await changeEmployeePassword(req.params.id as string, password);
    successResponse(res, { message: 'Lozinka promijenjena' });
  } catch {
    errorResponse(res, 'NOT_FOUND', 'Employee not found', 404);
  }
});

// DELETE /:id — Deactivate employee (soft delete)
router.delete('/:id', validateParams(idParamSchema), async (req: AuthRequest, res) => {
  try {
    const employee = await deactivateEmployee(req.params.id as string);
    successResponse(res, employee);
  } catch {
    errorResponse(res, 'NOT_FOUND', 'Employee not found', 404);
  }
});

export default router;
