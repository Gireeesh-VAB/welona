import { db } from '@/lib/db';
import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/service';
import type { BranchComplimentaryConfig } from '@shared/types/admin-complimentary';

export const GET = route(async (req) => {
  const claims = requireAuth(req);
  const branchId = claims.branchIds?.[0] ?? null;

  const limit = branchId
    ? await db.branchComplimentaryLimit.findUnique({ where: { branchId } })
    : null;

  const config: BranchComplimentaryConfig = {
    branchPercentage: limit?.percentage ?? null,
    limitIsActive: limit?.isActive ?? false,
  };

  return ok(config);
});
