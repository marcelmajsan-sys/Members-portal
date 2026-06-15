import type { Request, Response, NextFunction } from 'express';
import { type ZodSchema, ZodError } from 'zod';
import { errorResponse } from '../utils/api-response.js';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.errors
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join(', ');
        errorResponse(res, 'VALIDATION_ERROR', message, 400);
        return;
      }
      next(error);
    }
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req.query);
      // serverless-express makes req.query a read-only getter, so store parsed on res.locals
      res.locals.query = parsed;
      try { req.query = parsed as typeof req.query; } catch { /* read-only in Lambda */ }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.errors
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join(', ');
        errorResponse(res, 'VALIDATION_ERROR', message, 400);
        return;
      }
      next(error);
    }
  };
}

export function validateParams(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req.params);
      res.locals.params = parsed;
      try { req.params = parsed as typeof req.params; } catch { /* read-only in Lambda */ }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.errors
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join(', ');
        errorResponse(res, 'VALIDATION_ERROR', message, 400);
        return;
      }
      next(error);
    }
  };
}
