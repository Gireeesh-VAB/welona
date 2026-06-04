import { db } from '@/lib/db';
import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { requireAdminOrBranchAuth } from '@/lib/auth/service';
import { resolveOrgId } from '@/lib/org';

/**
 * GET /api/v1/admin/treatments — treatments master (admin + branch sessions).
 *
 * Org-wide reference data used to populate line-item / package selectors in the
 * admin sales forms. Read-only; treatments are managed on the employee side.
 */
export const GET = route(async (req) => {
  requireAdminOrBranchAuth(req);
  const orgId = await resolveOrgId();

  const treatments = await db.treatment.findMany({
    where: { orgId },
    orderBy: { name: 'asc' },
  });
  return ok(treatments);
});
