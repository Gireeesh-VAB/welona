import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok, created } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminBranchComplimentaryLimitUpsertSchema } from '@shared/schemas/admin-complimentary';
import {
  toAdminBranchComplimentaryLimit,
  complimentaryLimitInclude,
} from '@/lib/admin-complimentary-mapper';

async function resolveOrgId(): Promise<string> {
  const org = await db.organization.findFirst({ select: { id: true } });
  if (!org) throw Errors.notFound('Organization');
  return org.id;
}

export const GET = route(async (req) => {
  requireAdminAuth(req);
  const orgId = await resolveOrgId();

  const limits = await db.branchComplimentaryLimit.findMany({
    where: { orgId },
    include: complimentaryLimitInclude,
    orderBy: { branch: { name: 'asc' } },
  });

  return ok(limits.map(toAdminBranchComplimentaryLimit));
});

export const POST = route(async (req) => {
  requireAdminAuth(req);
  const body = await parseBody(req, adminBranchComplimentaryLimitUpsertSchema);
  const orgId = await resolveOrgId();

  const branch = await db.branch.findUnique({ where: { id: body.branchId } });
  if (!branch) throw Errors.notFound('Branch');

  const limit = await db.branchComplimentaryLimit.upsert({
    where: { branchId: body.branchId },
    create: {
      orgId,
      branchId: body.branchId,
      percentage: body.percentage,
      isActive: body.isActive,
    },
    update: {
      percentage: body.percentage,
      isActive: body.isActive,
    },
    include: complimentaryLimitInclude,
  });

  return created(toAdminBranchComplimentaryLimit(limit));
});
