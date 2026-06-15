import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { REFRESH_COOKIE, clearSessionCookies, revokeSession, revokeSystemSession } from '@/lib/auth/service';

/**
 * POST /api/v1/auth/logout — end the session (section 6.1).
 *
 * Revokes the refresh token so it cannot be reused, then clears both cookies.
 */
export const POST = route(async (req) => {
  const token = req.cookies.get(REFRESH_COOKIE)?.value;
  await revokeSession(token);
  await revokeSystemSession(token);
  const res = ok({ loggedOut: true });
  clearSessionCookies(res);
  return res;
});
