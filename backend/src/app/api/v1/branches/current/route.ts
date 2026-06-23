import { db } from '@/lib/db';
import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/service';

/**
 * GET /api/v1/branches/current — lightweight branch info for the signed-in
 * staff member's branch, used by the portal to resolve stateId for GST routing.
 */
export const GET = route(async (req) => {
  const claims = requireAuth(req);
  const branchId = claims.branchIds[0] ?? null;

  if (!branchId) return ok({ stateId: null, country: null });

  const branch = await db.branch.findUnique({
    where: { id: branchId },
    select: { stateId: true, zone: { select: { country: true } } },
  });

  const stateId = branch?.stateId ?? null;
  // Country comes from the branch's zone; fall back to "India" when a stateId
  // is set (all seeded states are Indian states).
  const country = branch?.zone?.country ?? (stateId ? 'India' : null);

  return ok({ stateId, country });
});
