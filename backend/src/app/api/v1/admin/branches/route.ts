import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminBranchCreateSchema, adminBranchListQuerySchema } from '@shared/schemas/admin-branches';
import { toAdminBranch, branchAdminInclude } from '@/lib/admin-branch-mapper';
import { assertValidParent } from '@/lib/admin-branch-hierarchy';

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
  // Branch sessions read the branch list (reference for filters/forms); only
  // admins create/edit branches (POST/PUT/DELETE stay admin-only).
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
      include: branchAdminInclude,
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

  // Validate the parent branch (existence; cycles are impossible on create).
  await assertValidParent(null, body.parentBranchId);

  const orgId = await resolveOrgId();

  // Only the first primary in the submitted list wins; later "primary" flags
  // are demoted so we never persist multiple primaries for the same branch.
  const submittedAddresses = body.additionalAddresses ?? [];
  let primarySeen = false;
  const normalisedAddresses = submittedAddresses.map((addr) => {
    const isPrimary = Boolean(addr.isPrimary) && !primarySeen;
    if (isPrimary) primarySeen = true;
    return { ...addr, isPrimary };
  });

  try {
    const branch = await db.$transaction(async (tx) => {
      const created = await tx.branch.create({
        data: {
          orgId,
          name: body.branchName,
          code: body.branchCode,
          branchType: body.branchType ?? 'company',
          address: body.address ?? null,
          phone: body.phone ?? null,
          email: body.email ?? null,
          ipAddress: body.ipAddress ?? null,
          loginPassword: body.loginPassword ?? null,
          zoneId: body.zoneId,
          parentBranchId: body.parentBranchId ?? null,
          isActive: body.isActive ?? true,
          createdByAdminId: claims.sub,
        },
      });

      // Auto-create a SystemUser login account for the branch if a password was given.
      if (body.loginPassword) {
        const passwordHash = await bcrypt.hash(body.loginPassword, 10);
        const userName = body.branchCode.toLowerCase();
        const existing = await tx.systemUser.findUnique({ where: { userName } });
        if (!existing) {
          await tx.systemUser.create({
            data: {
              userName,
              email: body.email ?? null,
              passwordHash,
              branchId: created.id,
              isActive: true,
              createdByAdminId: claims.sub,
            },
          });
        }
      }

      if (normalisedAddresses.length > 0) {
        await tx.branchAddress.createMany({
          data: normalisedAddresses.map((addr) => ({
            branchId: created.id,
            label: addr.label,
            line1: addr.line1,
            line2: addr.line2 ?? null,
            city: addr.city ?? null,
            state: addr.state ?? null,
            pincode: addr.pincode ?? null,
            country: addr.country ?? 'India',
            phone: addr.phone ?? null,
            email: addr.email ?? null,
            isPrimary: addr.isPrimary,
            isActive: addr.isActive,
          })),
        });
      }

      return tx.branch.findUniqueOrThrow({
        where: { id: created.id },
        include: branchAdminInclude,
      });
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
