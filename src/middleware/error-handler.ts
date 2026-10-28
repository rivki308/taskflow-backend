import { Prisma } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { HttpError } from '../utils/http-error';

interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

function send(res: Response, status: number, code: string, message: string, details?: unknown) {
  const body: ErrorBody = { error: { code, message } };
  if (details !== undefined) body.error.details = details;
  res.status(status).json(body);
}

/** 404 for any /api route that does not exist. */
export function notFoundHandler(req: Request, res: Response) {
  send(res, 404, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl.split('?')[0]} does not exist`);
}

/**
 * Central error handler — every error ends up here and gets the same JSON shape:
 *   { "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }
 * Internal details (SQL, stack traces, secrets) are logged on the server only.
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return send(res, err.status, err.code, err.message, err.details);
  }

  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join('.') || '(body)',
      message: issue.code === 'unrecognized_keys' ? `Unknown field(s): ${issue.keys.join(', ')}` : issue.message,
    }));
    return send(res, 400, 'VALIDATION_ERROR', 'Invalid request data', details);
  }

  // Errors thrown by express.json()
  const bodyError = err as { type?: string; status?: number };
  if (bodyError?.type === 'entity.parse.failed') {
    return send(res, 400, 'INVALID_JSON', 'Request body is not valid JSON');
  }
  if (bodyError?.type === 'entity.too.large') {
    return send(res, 413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        return send(res, 409, 'CONFLICT', 'A record with the same unique value already exists');
      case 'P2003':
        return send(res, 409, 'CONFLICT', 'The operation conflicts with related records');
      case 'P2025':
        return send(res, 404, 'NOT_FOUND', 'Resource not found');
    }
  }

  // CHECK constraint violations reach us as unknown request errors (code 23514 inside the message).
  if (err instanceof Prisma.PrismaClientUnknownRequestError && err.message.includes('23514')) {
    return send(res, 400, 'VALIDATION_ERROR', 'Data violates a database rule');
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    console.error('[db] Cannot connect to the database:', err.message);
    return send(res, 503, 'DATABASE_UNAVAILABLE', 'Database is not available. Try again later');
  }

  if (!env.isTest) console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  return send(res, 500, 'INTERNAL_ERROR', 'Something went wrong on the server');
}
