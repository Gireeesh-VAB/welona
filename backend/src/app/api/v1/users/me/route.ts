import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { findStaff, requireAuth, toAuthUser } from '@/lib/auth/service';

/**
 * GET /api/v1/users/me — the signed-in staff member's profile (section 6.1).
 */
export const GET = route(async (req) => {
  const claims = requireAuth(req);
  const staff = await findStaff({ id: claims.sub });
  if (!staff) throw Errors.unauthorized('Account no longer exists');
  return ok(toAuthUser(staff));
});
