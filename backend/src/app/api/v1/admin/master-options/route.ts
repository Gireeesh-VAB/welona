import { db } from '@/lib/db';
import { route, parseQuery } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { requireAdminOrBranchAuth } from '@/lib/auth/service';
import { resolveOrgId } from '@/lib/org';
import { masterOptionQuerySchema } from '@shared/schemas/sales';

/**
 * GET /api/v1/admin/master-options?kind= — configurable dropdown lists
 * (enquiry type, media, call type) for admin + branch sessions.
 *
 * Org-wide reference data used by the admin enquiry/lead forms. Read-only;
 * options are managed on the employee side.
 */
export const GET = route(async (req) => {
  requireAdminOrBranchAuth(req);
  const orgId = await resolveOrgId();
  const { kind } = parseQuery(req, masterOptionQuerySchema);

  const options = await db.masterOption.findMany({
    where: { orgId, kind },
    orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
  });
  return ok(options);
});
