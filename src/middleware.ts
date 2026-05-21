import { NextResponse, type NextRequest } from 'next/server';

/**
 * Lightweight route guard for the Admin Panel.
 *
 * Two parallel login flows, each with its own login page:
 *   • Employee: /login       → /
 *   • Admin:    /admin/login → /admin/*
 *
 * The presence of the `welona_token` cookie is the signal that a session
 * exists (of either type). The cookie type (`staff` vs `admin`) is verified by
 * AuthGuard / AdminAuthGuard, and every API call validates the JWT
 * independently (Reference Architecture, section 7.3).
 */
const AUTH_COOKIE = 'welona_token';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthenticated = Boolean(request.cookies.get(AUTH_COOKIE)?.value);

  const isAdminLogin = pathname === '/admin/login';
  const isEmployeeLogin = pathname === '/login';
  const isLoginPage = isAdminLogin || isEmployeeLogin;
  const isAdminArea = pathname === '/admin' || pathname.startsWith('/admin/');

  if (!isAuthenticated && !isLoginPage) {
    const url = request.nextUrl.clone();
    // Unauthenticated visits to /admin/* land on the admin login; everything
    // else lands on the employee login.
    url.pathname = isAdminArea ? '/admin/login' : '/login';
    return NextResponse.redirect(url);
  }

  if (isAuthenticated && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = isAdminLogin ? '/admin' : '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on page routes only — never on /api (those handlers do their own
  // auth) nor on Next internals and static assets.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
