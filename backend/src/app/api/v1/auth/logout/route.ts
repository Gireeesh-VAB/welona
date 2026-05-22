import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { REFRESH_COOKIE, clearSessionCookies, revokeSession } from '@/lib/auth/service';

/**
 * POST /api/v1/auth/logout — end the session (section 6.1).
 *
 * Revokes the refresh token so it cannot be reused, then clears both cookies.
 */
export const POST = route(async (req) => {
  await revokeSession(req.cookies.get(REFRESH_COOKIE)?.value);
  const res = ok({ loggedOut: true });
  clearSessionCookies(res);
  return res;
});
