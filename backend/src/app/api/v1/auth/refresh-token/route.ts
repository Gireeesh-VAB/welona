import { route } from '@/lib/api/handler';
import { ok, fail } from '@/lib/api/response';
import { ApiError } from '@/lib/api/errors';
import {
  REFRESH_COOKIE,
  applySessionCookies,
  clearSessionCookies,
  rotateSession,
} from '@/lib/auth/service';
import type { SessionResult } from '@shared/types/auth';

/**
 * POST /api/v1/auth/refresh-token — silent token refresh (section 6.1).
 *
 * Reads the httpOnly refresh cookie, rotates it, and returns a fresh access
 * token. If refresh fails, the stale cookies are cleared so the client and
 * middleware stop treating the session as live.
 */
export const POST = route(async (req) => {
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;

  try {
    if (!refreshToken) {
      throw new ApiError('UNAUTHORIZED', 'No active session', 401);
    }
    const { accessToken, refreshToken: rotated, user } = await rotateSession(refreshToken);
    const res = ok<SessionResult>({ user, accessToken });
    applySessionCookies(res, accessToken, rotated);
    return res;
  } catch (error) {
    const res =
      error instanceof ApiError
        ? fail(error.code, error.message, error.status)
        : fail('UNAUTHORIZED', 'Session could not be refreshed', 401);
    clearSessionCookies(res);
    return res;
  }
});
