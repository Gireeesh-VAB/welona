import { db } from '@/lib/db';
import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { requireAuth, requirePermission } from '@/lib/auth/service';

/** GET /api/v1/branches — active branches, for staff and record assignment. */
export const GET = route(async (req) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'staff:read');

  const branches = await db.branch.findMany({
    where: { orgId: claims.orgId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
  return ok(branches);
});
