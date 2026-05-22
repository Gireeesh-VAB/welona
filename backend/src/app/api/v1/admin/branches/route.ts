import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminBranchCreateSchema, adminBranchListQuerySchema } from '@shared/schemas/admin-branches';
import { toAdminBranch } from '@/lib/admin-branch-mapper';

/**
 * Admin master-data: branches.
 *
 * GET  /api/v1/admin/branches?search=&page=&limit= — paginated, searchable list.
 * POST /api/v1/admin/branches                      — create a new branch.
 *
 * Single-tenant for now: the admin doesn't carry an orgId on the JWT, so we
 * resolve the single Organization row at request time.
 */
async function resolveOrgId(): Promise<string> {
  const org = await db.organization.findFirst({ select: { id: true } });
  if (!org) throw Errors.notFound('Organization');
  return org.id;
}

export const GET = route(async (req) => {
  requireAdminAuth(req);
  const { search, page, limit } = parseQuery(req, adminBranchListQuerySchema);

  const where: Prisma.BranchWhereInput = search
    ? {
        OR: [
          { name: { contains: search } },
          { code: { contains: search } },
          { address: { contains: search } },
          { phone: { contains: search } },
          { email: { contains: search } },
          { zone: { stateName: { contains: search } } },
          { zone: { country: { contains: search } } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    db.branch.findMany({
      where,
      include: { zone: true, createdByAdmin: true },
      orderBy: [{ createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.branch.count({ where }),
  ]);

  return ok(items.map(toAdminBranch), buildMeta(page, limit, total));
});

export const POST = route(async (req) => {
  const claims = requireAdminAuth(req);
  const body = await parseBody(req, adminBranchCreateSchema);

  // Verify the chosen zone exists before attempting the insert.
  const zone = await db.zone.findUnique({ where: { id: body.zoneId } });
  if (!zone) throw Errors.badRequest('Selected zone no longer exists.');

  const orgId = await resolveOrgId();

  try {
    const branch = await db.branch.create({
      data: {
        orgId,
        name: body.branchName,
        code: body.branchCode,
        address: body.address ?? null,
        phone: body.phone ?? null,
        email: body.email ?? null,
        ipAddress: body.ipAddress ?? null,
        zoneId: body.zoneId,
        createdByAdminId: claims.sub,
      },
      include: { zone: true, createdByAdmin: true },
    });
    return created(toAdminBranch(branch));
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw Errors.conflict(`A branch with code "${body.branchCode}" already exists.`);
    }
    throw error;
  }
});
