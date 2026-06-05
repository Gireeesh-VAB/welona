import { db } from '@/lib/db';
import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { requireAdminAuth } from '@/lib/auth/service';
import { resolveOrgId } from '@/lib/org';

/**
 * GET /api/v1/admin/sales/salespeople — active staff who can own pipeline
 * records. Used to populate owner selectors in the admin sales forms.
 *
 * Branch sessions only see staff of their own branch (so a branch user can
 * only assign a salesperson who belongs to that branch — see the `ownerStaffId`
 * validation in the create routes).
 */
export const GET = route(async (req) => {
  requireAdminAuth(req);
  const orgId = await resolveOrgId();

  const staff = await db.staff.findMany({
    where: { orgId, status: 'active' },
    select: { id: true, name: true, role: { select: { name: true } } },
    orderBy: { name: 'asc' },
  });

  return ok(staff.map((s) => ({ id: s.id, name: s.name, roleName: s.role.name })));
});
