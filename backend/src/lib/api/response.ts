/**
 * NextResponse helpers for the standard API envelope.
 *
 * The wire-format types (`SuccessBody`, `ErrorBody`, `Meta`) live in
 * `shared/src/api/response.ts` so the frontend can depend on them without
 * pulling in `next/server`. This file re-exports them for backend callers.
 */
import { NextResponse } from 'next/server';
import type { ErrorBody, Meta, SuccessBody } from '@shared/api/response';

export type { ErrorBody, Meta, SuccessBody } from '@shared/api/response';

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
