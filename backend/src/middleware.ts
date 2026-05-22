import { NextResponse, type NextRequest } from 'next/server';

/**
 * CORS middleware for the backend API.
 *
 * The frontend (default :3001) talks to this service cross-origin, so every
 * /api/* response must carry the access-control headers. Preflight OPTIONS
 * requests short-circuit here with a 204. `credentials: 'include'` on the
 * frontend requires an explicit origin (not `*`) plus the credentials header.
 */
const ALLOWED_ORIGIN = process.env.CORS_ALLOWED_ORIGIN || 'http://localhost:3001';

const ALLOW_HEADERS = 'Content-Type, Authorization, X-Requested-With';
const ALLOW_METHODS = 'GET, POST, PATCH, PUT, DELETE, OPTIONS';

function withCors(res: NextResponse, origin: string | null): NextResponse {
  const allow =
    origin && (origin === ALLOWED_ORIGIN || ALLOWED_ORIGIN === '*') ? origin : ALLOWED_ORIGIN;
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
