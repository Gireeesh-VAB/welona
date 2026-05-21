import { NextResponse } from 'next/server';

/**
 * Standardised API envelope.
 * Source: Developer Reference Architecture v2.0, section 6.7.
 */

/** Pagination metadata returned alongside list responses. */
export interface Meta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SuccessBody<T> {
  success: true;
  data: T;
  meta?: Meta;
}

export interface ErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}

/** Build pagination metadata from a page/limit/total triple. */
export function buildMeta(page: number, limit: number, total: number): Meta {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

/** Success response: `{ success: true, data, meta? }`. */
export function ok<T>(data: T, meta?: Meta, status = 200): NextResponse<SuccessBody<T>> {
  return NextResponse.json({ success: true, data, ...(meta ? { meta } : {}) }, { status });
}

/** `201 Created` success response. */
export function created<T>(data: T): NextResponse<SuccessBody<T>> {
  return ok(data, undefined, 201);
}

/** Error response: `{ success: false, error: { code, message, details? } }`. */
export function fail(
  code: string,
  message: string,
  status: number,
  details?: ErrorBody['error']['details'],
): NextResponse<ErrorBody> {
  return NextResponse.json(
    { success: false, error: { code, message, ...(details ? { details } : {}) } },
    { status },
  );
}
