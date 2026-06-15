import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import {
  findStaff,
  findSystemUserById,
  requireAuth,
  toAuthUser,
  toSystemAuthUser,
} from '@/lib/auth/service';

/**
 * GET /api/v1/users/me — the signed-in staff member's profile (section 6.1).
 * Also handles SystemUser (branch portal) sessions whose sub is a SystemUser ID.
 */
export const GET = route(async (req) => {
  const claims = requireAuth(req);

  const staff = await findStaff({ id: claims.sub });
  if (staff) return ok(toAuthUser(staff));

  // SystemUser sessions share the 'staff' JWT type but have a SystemUser sub.
  const systemUser = await findSystemUserById(claims.sub);
  if (systemUser) return ok(toSystemAuthUser(systemUser));

  throw Errors.unauthorized('Account no longer exists');
});
