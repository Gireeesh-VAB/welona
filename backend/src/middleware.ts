import { NextResponse, type NextRequest } from 'next/server';

/**
 * CORS middleware for the backend API.
 *
 * The frontend (default :3001) talks to this service cross-origin, so every
 * /api/* response must carry the access-control headers. Preflight OPTIONS
 * requests short-circuit here with a 204. `credentials: 'include'` on the
 * frontend requires an explicit origin (not `*`) plus the credentials header.
 *
 * `CORS_ALLOWED_ORIGIN` accepts a comma-separated list — e.g.
 *   `CORS_ALLOWED_ORIGIN="http://localhost:3001,https://welona.vabinformatics.com"`
 * so local dev and the production origin can coexist in one .env. Use `*`
 * to reflect any origin (development convenience — do NOT use in production).
 */
const ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGIN || 'http://localhost:3001')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const ALLOW_HEADERS = 'Content-Type, Authorization, X-Requested-With';
const ALLOW_METHODS = 'GET, POST, PATCH, PUT, DELETE, OPTIONS';

function isAllowed(origin: string | null): origin is string {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin);
}

function withCors(res: NextResponse, origin: string | null): NextResponse {
  // Echo the caller's origin only if it's on the allow-list; otherwise fall
  // back to the first configured origin so the response is still valid.
  const allow = isAllowed(origin) ? origin : ALLOWED_ORIGINS[0];
  res.headers.set('Access-Control-Allow-Origin', allow);
  res.headers.set('Access-Control-Allow-Credentials', 'true');
  res.headers.set('Access-Control-Allow-Methods', ALLOW_METHODS);
  res.headers.set('Access-Control-Allow-Headers', ALLOW_HEADERS);
  res.headers.set('Vary', 'Origin');
  return res;
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');

  if (request.method === 'OPTIONS') {
    return withCors(new NextResponse(null, { status: 204 }), origin);
  }

  return withCors(NextResponse.next(), origin);
}

export const config = {
  matcher: ['/api/:path*'],
};
