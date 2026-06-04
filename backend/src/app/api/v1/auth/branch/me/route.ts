import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { findSystemUser, requireBranchAuth, toBranchAuthUser } from '@/lib/auth/service';

/**
 * GET /api/v1/auth/branch/me — the signed-in branch user's profile.
 * Rejects staff and admin sessions; used by the branch guard to verify the
 * session is the branch-typed one.
 */
export const GET = route(async (req) => {
  const claims = requireBranchAuth(req);
  const user = await findSystemUser({ id: claims.sub });
  if (!user || !user.isActive || !user.branchId) {
    throw Errors.unauthorized('Branch account no longer exists');
  }
  return ok(toBranchAuthUser(user));
});
