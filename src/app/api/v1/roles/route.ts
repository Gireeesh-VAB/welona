import { db } from '@/lib/db';
import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { requireAuth, requirePermission } from '@/lib/auth/service';

/** GET /api/v1/roles — the organisation's roles, for staff assignment. */
export const GET = route(async (req) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'staff:read');

  const roles = await db.role.findMany({
    where: { orgId: claims.orgId },
    select: { id: true, name: true, scope: true },
    orderBy: { name: 'asc' },
  });
  return ok(roles);
});
