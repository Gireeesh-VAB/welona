import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { REFRESH_COOKIE, clearSessionCookies, revokeAdminSession } from '@/lib/auth/service';

/**
 * POST /api/v1/auth/admin/logout — end the current admin session.
 * Revokes the AdminRefreshToken if the cookie holds one, then clears cookies.
 */
export const POST = route(async (req) => {
  await revokeAdminSession(req.cookies.get(REFRESH_COOKIE)?.value);
  const res = ok({ loggedOut: true });
  clearSessionCookies(res);
  return res;
});
