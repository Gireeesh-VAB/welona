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

  if (!branchId) return ok({ stateId: null });

  const branch = await db.branch.findUnique({
    where: { id: branchId },
    select: { stateId: true },
  });

  return ok({ stateId: branch?.stateId ?? null });
});
