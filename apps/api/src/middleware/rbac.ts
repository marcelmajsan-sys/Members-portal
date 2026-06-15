import type { Response, NextFunction } from 'express';
import type { AuthRequest } from './auth.js';
import { errorResponse } from '../utils/api-response.js';

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    if (!roles.includes(req.user.role)) {
      errorResponse(res, 'FORBIDDEN', 'Insufficient permissions', 403);
      return;
    }

    next();
  };
}
