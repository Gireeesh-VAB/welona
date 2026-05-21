import { route } from '@/lib/api/handler';
import { ok, fail } from '@/lib/api/response';
import { ApiError } from '@/lib/api/errors';
import {
  REFRESH_COOKIE,
  applySessionCookies,
  clearSessionCookies,
  rotateAdminSession,
} from '@/lib/auth/service';
import type { AdminSessionResult } from '@/types/auth';

/**
 * POST /api/v1/auth/admin/refresh-token — silent admin token refresh.
 *
 * Mirrors /auth/refresh-token but rotates against the AdminRefreshToken pool.
 * The api-client calls this for any 401 on an admin-side path so admin
 * sessions are not torn down by the staff refresh route (which doesn't know
 * about AdminUser).
 */
export const POST = route(async (req) => {
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;

  try {
    if (!refreshToken) {
      throw new ApiError('UNAUTHORIZED', 'No active admin session', 401);
    }
    const {
      accessToken,
      refreshToken: rotated,
      user,
    } = await rotateAdminSession(refreshToken);
    const res = ok<AdminSessionResult>({ user, accessToken });
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
