import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { findAdmin, requireAdminAuth, toAdminAuthUser } from '@/lib/auth/service';

/**
 * GET /api/v1/auth/admin/me — the signed-in admin user's profile.
 * Rejects staff sessions; used by AdminAuthGuard to verify the session is the
 * admin-typed one.
 */
export const GET = route(async (req) => {
  const claims = requireAdminAuth(req);
  const admin = await findAdmin({ id: claims.sub });
  if (!admin) throw Errors.unauthorized('Admin account no longer exists');
  return ok(toAdminAuthUser(admin));
});
