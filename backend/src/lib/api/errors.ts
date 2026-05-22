import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { fail, type ErrorBody } from './response';

/**
 * Typed API error. Throw one of these (or use the factory helpers) from any
 * route handler; `handleError` converts it into the standard error envelope.
 */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly details?: ErrorBody['error']['details'],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const Errors = {
  validation: (details?: ErrorBody['error']['details']) =>
    new ApiError('VALIDATION_ERROR', 'Invalid input data', 422, details),
  unauthorized: (message = 'Authentication required') =>
    new ApiError('UNAUTHORIZED', message, 401),
  forbidden: (message = 'You do not have permission to perform this action') =>
    new ApiError('FORBIDDEN', message, 403),
  notFound: (resource = 'Resource') => new ApiError('NOT_FOUND', `${resource} not found`, 404),
  conflict: (message: string) => new ApiError('CONFLICT', message, 409),
  badRequest: (message: string) => new ApiError('BAD_REQUEST', message, 400),
};

/** Convert any thrown value into the standard error response. */
export function handleError(error: unknown): NextResponse<ErrorBody> {
  if (error instanceof ApiError) {
    return fail(error.code, error.message, error.status, error.details);
  }

  if (error instanceof ZodError) {
    const details = error.issues.map((i) => ({
      field: i.path.join('.') || '(root)',
      message: i.message,
    }));
    return fail('VALIDATION_ERROR', 'Invalid input data', 422, details);
  }

  console.error('[api] Unhandled error:', error);
  return fail('INTERNAL_ERROR', 'An unexpected error occurred', 500);
}
