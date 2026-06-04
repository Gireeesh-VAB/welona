import { route } from '@/lib/api/handler';
import { ok, fail } from '@/lib/api/response';
import { ApiError } from '@/lib/api/errors';
import {
  REFRESH_COOKIE,
  applySessionCookies,
  clearSessionCookies,
  rotateBranchSession,
} from '@/lib/auth/service';
import type { BranchSessionResult } from '@shared/types/auth';

/**
 * POST /api/v1/auth/branch/refresh-token — silent branch token refresh.
 *
 * Mirrors /auth/admin/refresh-token but rotates against the SystemRefreshToken
 * pool. The api-client calls this for any 401 on a branch-side path.
 */
export const POST = route(async (req) => {
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;

  try {
    if (!refreshToken) {
      throw new ApiError('UNAUTHORIZED', 'No active branch session', 401);
    }
    const {
      accessToken,
      refreshToken: rotated,
      user,
    } = await rotateBranchSession(refreshToken);
    const res = ok<BranchSessionResult>({ user, accessToken });
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
