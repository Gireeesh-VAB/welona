import { NextResponse, type NextRequest } from 'next/server';
import { z, ZodError } from 'zod';
import { Errors, handleError } from './errors';

/** A route handler that may throw `ApiError`/`ZodError`. */
type Handler<C> = (req: NextRequest, ctx: C) => Promise<NextResponse> | NextResponse;

/**
 * Wraps a route handler so any thrown `ApiError`, `ZodError` or unexpected
 * error becomes the standard error envelope (section 6.7). Every route
 * handler under /api/v1 should be wrapped with this.
 */
export function route<C = unknown>(handler: Handler<C>) {
  return async (req: NextRequest, ctx: C): Promise<NextResponse> => {
    try {
      return await handler(req, ctx);
    } catch (error) {
      return handleError(error);
    }
  };
}

/**
 * Parse + validate a JSON request body, throwing `VALIDATION_ERROR` on
 * failure. The result is the schema's *output* type (defaults applied).
 */
export async function parseBody<S extends z.ZodTypeAny>(
  req: NextRequest,
  schema: S,
): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw Errors.badRequest('Request body must be valid JSON');
  }
  try {
    return schema.parse(raw);
  } catch (error) {
    if (error instanceof ZodError) {
      throw Errors.validation(
        error.issues.map((i) => ({
          field: i.path.join('.') || '(root)',
          message: i.message,
        })),
      );
    }
    throw error;
  }
}

/** Validate query-string parameters against a schema (output type returned). */
export function parseQuery<S extends z.ZodTypeAny>(req: NextRequest, schema: S): z.infer<S> {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  return schema.parse(params);
}

/**
 * A boolean query-string parameter. `z.coerce.boolean()` is broken for query
 * strings — it treats the literal string `"false"` as `true` (any non-empty
 * string is truthy). This parses the canonical `"true"`/`"false"` strings
 * correctly. Returns `undefined` when the param is absent (so `if (value)`
 * and `?? fallback` behave as expected).
 */
export function booleanQueryParam() {
  return z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true'));
}
