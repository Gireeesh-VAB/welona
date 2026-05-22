/**
 * Standardised API envelope (TYPES only).
 * Source: Developer Reference Architecture v2.0, section 6.7.
 *
 * Both backend and frontend depend on these shapes. The backend's
 * `ok` / `created` / `fail` helpers live in `backend/src/lib/api/response.ts`.
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
