import type { Response } from 'express';
import type { ApiResponse } from '@ecommerce-hr/shared';

export function successResponse<T>(res: Response, data: T, statusCode = 200): void {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };
  res.status(statusCode).json(response);
}

export function errorResponse(
  res: Response,
  code: string,
  message: string,
  statusCode = 400,
): void {
  const response: ApiResponse = {
    success: false,
    error: { code, message },
  };
  res.status(statusCode).json(response);
}

export function paginatedResponse<T>(
  res: Response,
  data: T,
  meta: { page: number; limit: number; total: number; totalPages?: number },
): void {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta,
  };
  res.status(200).json(response);
}
