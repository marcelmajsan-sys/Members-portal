import { Router } from 'express';
import crypto from 'node:crypto';
import { prisma } from '@ecommerce-hr/db';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@ecommerce-hr/shared';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rate-limit.js';
import { successResponse, errorResponse } from '../utils/api-response.js';
import { logger } from '../utils/logger.js';
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
} from '../services/auth.service.js';
import { emitEvent } from '../lib/event-bus.js';
import { notifyStaff } from '../services/notification.service.js';
import { DomainEvents } from '@ecommerce-hr/shared';
import { sendPasswordResetEmail } from '@ecommerce-hr/email';

const router = Router();

// POST /register
router.post('/register', authLimiter, validate(registerSchema), async (req, res) => {
  const { email, password, firstName, lastName, companyName, oib, memberType } = req.body;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    errorResponse(res, 'CONFLICT', 'A user with this email already exists', 409);
    return;
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      role: 'MEMBER',
    },
  });

  const company = await prisma.company.create({
    data: {
      name: companyName,
      oib,
      address: '',
      city: '',
      zip: '',
    },
  });

  const member = await prisma.member.create({
    data: {
      userId: user.id,
      companyId: company.id,
      memberType,
    },
  });

  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  // Emit member registered event (fire-and-forget)
  emitEvent(DomainEvents.MEMBER_REGISTERED, {
    userId: user.id,
    memberId: member.id,
    email: user.email,
    firstName: user.firstName,
  }).catch((err) => logger.error(err, 'Failed to emit MEMBER_REGISTERED event'));

  // Inbox: notify staff about the new member self-registration (await — serverless freeze)
  try {
    await notifyStaff({
      type: 'INFO',
      title: 'Novi član',
      message: `${user.firstName} ${user.lastName} (${companyName}) se registrirao/la kao član.`,
      actionUrl: `/members/${member.id}`,
    });
  } catch { /* ne ruši registraciju */ }

  successResponse(
    res,
    {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      member: {
        id: member.id,
        memberType: member.memberType,
        status: member.status,
      },
      accessToken,
      refreshToken,
    },
    201,
  );
});

// POST /login
router.post('/login', authLimiter, validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    errorResponse(res, 'INVALID_CREDENTIALS', 'Invalid email or password', 401);
    return;
  }

  if (!user.isActive) {
    errorResponse(res, 'ACCOUNT_DISABLED', 'Account is disabled', 403);
    return;
  }

  const isValid = await comparePassword(password, user.passwordHash);
  if (!isValid) {
    errorResponse(res, 'INVALID_CREDENTIALS', 'Invalid email or password', 401);
    return;
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  successResponse(res, {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
    accessToken,
    refreshToken,
  });
});

// POST /refresh
router.post('/refresh', async (req, res) => {
  const token = req.cookies?.refreshToken ?? req.body?.refreshToken;

  if (!token) {
    errorResponse(res, 'MISSING_TOKEN', 'Refresh token is required', 400);
    return;
  }

  try {
    const { accessToken, refreshToken } = await rotateRefreshToken(token);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    successResponse(res, { accessToken, refreshToken });
  } catch (error) {
    errorResponse(res, 'INVALID_TOKEN', (error as Error).message, 401);
  }
});

// POST /logout
router.post('/logout', async (req, res) => {
  const token = req.cookies?.refreshToken ?? req.body?.refreshToken;

  if (token) {
    await revokeRefreshToken(token);
  }

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });

  successResponse(res, { message: 'Logged out successfully' });
});

// POST /forgot-password
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), async (req, res) => {
  const { email } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });

  // Always return success to avoid email enumeration
  if (!user) {
    successResponse(res, { message: 'If the email exists, a reset link has been sent' });
    return;
  }

  const resetToken = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1);

  // Store reset token as a refresh token with a special prefix for simplicity
  await prisma.refreshToken.create({
    data: {
      token: `reset_${resetToken}`,
      userId: user.id,
      expiresAt,
    },
  });

  // Determine reset URL based on user role
  const baseUrl = user.role === 'MEMBER'
    ? (process.env.MEMBER_APP_URL ?? 'https://member.ecommerce.hr')
    : (process.env.OS_APP_URL ?? 'https://members.ecommerce.hr/admin');
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

  logger.info({ resetToken, email }, 'Password reset token generated');

  // Send password reset email
  try {
    await sendPasswordResetEmail(email, user.firstName, resetUrl);
  } catch (err) {
    logger.error(err, 'Failed to send password reset email');
  }

  successResponse(res, { message: 'If the email exists, a reset link has been sent' });
});

// POST /reset-password
router.post('/reset-password', validate(resetPasswordSchema), async (req, res) => {
  const { token, password } = req.body;

  const stored = await prisma.refreshToken.findUnique({
    where: { token: `reset_${token}` },
  });

  if (!stored || stored.expiresAt < new Date()) {
    if (stored) {
      await prisma.refreshToken.delete({ where: { id: stored.id } });
    }
    errorResponse(res, 'INVALID_TOKEN', 'Invalid or expired reset token', 400);
    return;
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.update({
    where: { id: stored.userId },
    data: { passwordHash },
  });

  await prisma.refreshToken.delete({ where: { id: stored.id } });

  successResponse(res, { message: 'Password reset successfully' });
});

// POST /change-password (authenticated)
router.post('/change-password', authenticate, async (req: any, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    errorResponse(res, 'VALIDATION_ERROR', 'Current and new password are required', 400);
    return;
  }

  if (newPassword.length < 6) {
    errorResponse(res, 'VALIDATION_ERROR', 'New password must be at least 6 characters', 400);
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) {
    errorResponse(res, 'NOT_FOUND', 'User not found', 404);
    return;
  }

  const isValid = await comparePassword(currentPassword, user.passwordHash);
  if (!isValid) {
    errorResponse(res, 'INVALID_CREDENTIALS', 'Trenutna lozinka nije ispravna', 400);
    return;
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  successResponse(res, { message: 'Password changed successfully' });
});

export default router;
