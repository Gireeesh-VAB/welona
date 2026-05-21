import { db } from '@/lib/db';
import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { requireAuth, requirePermission } from '@/lib/auth/service';

/**
 * GET /api/v1/sales/salespeople — active staff who can own pipeline records.
 * Used to populate owner selectors in the sales forms.
 */
export const GET = route(async (req) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'sales:read');

  const staff = await db.staff.findMany({
    where: { orgId: claims.orgId, status: 'active' },
    select: { id: true, name: true, role: { select: { name: true } } },
    orderBy: { name: 'asc' },
  });

  return ok(staff.map((s) => ({ id: s.id, name: s.name, roleName: s.role.name })));
});
