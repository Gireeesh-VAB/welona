import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { REFRESH_COOKIE, clearSessionCookies, revokeBranchSession } from '@/lib/auth/service';

/**
 * POST /api/v1/auth/branch/logout — end the current branch session.
 * Revokes the SystemRefreshToken if present, then clears cookies.
 */
export const POST = route(async (req) => {
  await revokeBranchSession(req.cookies.get(REFRESH_COOKIE)?.value);
  const res = ok({ loggedOut: true });
  clearSessionCookies(res);
  return res;
});
