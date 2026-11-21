import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { AppError, ErrorCode, ErrorDetail } from '../utils/AppError';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): Response {
  let statusCode = 500;
  let code: ErrorCode = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected internal server error occurred';
  let details: ErrorDetail[] | undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed for request payload';
    details = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Database validation failed';
    details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    code = 'BAD_REQUEST';
    message = `Invalid identifier format for field '${err.path}'`;
  } else if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: number }).code === 11000
  ) {
    statusCode = 409;
    code = 'CONFLICT';
    const keyValue = (err as { keyValue?: Record<string, unknown> }).keyValue;
    const duplicateField = keyValue ? Object.keys(keyValue).join(', ') : 'resource';
    message = `Duplicate value already exists for ${duplicateField}`;
  } else if (err instanceof Error) {
    message = env.NODE_ENV === 'production' ? message : err.message;
  }

  if (statusCode >= 500) {
    logger.error('Unhandled error in request pipeline', {
      method: req.method,
      path: req.originalUrl,
      statusCode,
      error: err instanceof Error ? err.stack || err.message : String(err),
    });
  }

  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  });
}
