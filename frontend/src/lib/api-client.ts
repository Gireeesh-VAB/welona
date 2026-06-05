/**
 * Typed API client for the Admin Panel.
 *
 * Talks to the app's own /api/v1 route handlers. Unwraps the standard
 * response envelope (section 6.7), throwing `ApiClientError` on failure, and
 * transparently refreshes an expired access token once before giving up.
 */
import type { SuccessBody, ErrorBody, Meta } from '@shared/api/response';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

/** Error thrown for any non-success API response. */
export class ApiClientError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly details?: ErrorBody['error']['details'],
  ) {
    super(message);
    this.name = 'ApiClientError';
  }

  /** Field-level validation messages keyed by field name. */
  get fieldErrors(): Record<string, string> {
    return (this.details ?? []).reduce<Record<string, string>>((acc, d) => {
      acc[d.field] = d.message;
      return acc;
    }, {});
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  /** JSON request body; serialised automatically. */
  body?: unknown;
  /** Query-string parameters; undefined/null values are skipped. */
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
}

/** Result of a list endpoint: the items plus pagination metadata. */
export interface Paginated<T> {
  items: T[];
  meta: Meta;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = `${BASE_URL}${path}`;
  if (!query) return url;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      qs.append(key, String(value));
    }
  }
  const str = qs.toString();
  return str ? `${url}?${str}` : url;
}

async function rawRequest(path: string, options: RequestOptions): Promise<Response> {
  const { method = 'GET', body, query, signal } = options;
  return fetch(buildUrl(path, query), {
    method,
    credentials: 'include', // send the session cookies
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
    cache: 'no-store',
  });
}

const refreshInFlight = new Map<string, Promise<boolean>>();

/**
 * Pick the right refresh endpoint.
 *
 * Routing by the CURRENT PAGE (not the API path) is deliberate: the admin and
 * staff pools share the same session cookies, and the admin refresh route
 * clears those cookies on failure. If a staff-portal page made a stray
 * `/admin/*` API call, routing by API path would fire the admin refresh, which
 * fails and wipes the live staff session (a phantom logout). The page location
 * always reflects the real session pool, so route by that instead.
 */
function refreshPathFor(path: string): string {
  if (typeof window !== 'undefined') {
    const onAdminPage = window.location.pathname.startsWith('/admin');
    return onAdminPage ? '/auth/admin/refresh-token' : '/auth/refresh-token';
  }
  // SSR fallback: route by the API path.
  return path.startsWith('/admin/') || path.startsWith('/auth/admin/')
    ? '/auth/admin/refresh-token'
    : '/auth/refresh-token';
}

/** Attempt a single token refresh; concurrent callers per pool share one request. */
async function tryRefresh(path: string): Promise<boolean> {
  const refreshPath = refreshPathFor(path);
  if (!refreshInFlight.has(refreshPath)) {
    const p = rawRequest(refreshPath, { method: 'POST' })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight.delete(refreshPath);
      });
    refreshInFlight.set(refreshPath, p);
  }
  return refreshInFlight.get(refreshPath)!;
}

async function parse<T>(res: Response): Promise<SuccessBody<T>> {
  let json: SuccessBody<T> | ErrorBody;
  try {
    json = (await res.json()) as SuccessBody<T> | ErrorBody;
  } catch {
    throw new ApiClientError('NETWORK_ERROR', `Unexpected response (${res.status})`, res.status);
  }
  if (!json.success) {
    throw new ApiClientError(json.error.code, json.error.message, res.status, json.error.details);
  }
  return json;
}

/**
 * Perform an API request and return the unwrapped `data`.
 * Throws `ApiClientError` on any failure.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let res = await rawRequest(path, options);

  // One transparent retry after refreshing an expired access token. Skip for
  // /auth/* endpoints — they ARE the refresh / login surface themselves.
  const isAuthEndpoint = path.startsWith('/auth/');
  if (res.status === 401 && !isAuthEndpoint && (await tryRefresh(path))) {
    res = await rawRequest(path, options);
  }

  return (await parse<T>(res)).data;
}

/** Like `apiRequest` but returns the items plus pagination metadata. */
export async function apiList<T>(path: string, options: RequestOptions = {}): Promise<Paginated<T>> {
  let res = await rawRequest(path, options);
  if (res.status === 401 && !path.startsWith('/auth/') && (await tryRefresh(path))) {
    res = await rawRequest(path, options);
  }
  const body = await parse<T[]>(res);
  return {
    items: body.data,
    meta: body.meta ?? { page: 1, limit: body.data.length, total: body.data.length, totalPages: 1 },
  };
}

/** Convenience verbs. */
export const api = {
  get: <T>(path: string, query?: RequestOptions['query'], signal?: AbortSignal) =>
    apiRequest<T>(path, { method: 'GET', query, signal }),
  post: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PUT', body }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
};
