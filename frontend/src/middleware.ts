import { NextResponse, type NextRequest } from 'next/server';

/**
 * Lightweight route guard.
 *
 * Two login flows:
 *   • Employee: /login       → /
 *   • Admin:    /admin/login → /admin/*
 *
 * The presence of the `welona_token` cookie signals a live session. JWT type
 * validation is done by AuthGuard / AdminAuthGuard and every API handler.
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
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
