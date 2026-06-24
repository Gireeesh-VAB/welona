import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { resolveOrgId } from '@/lib/org';
import { adminRoleCreateSchema, adminRoleListQuerySchema } from '@shared/schemas/admin-roles';
import type { AdminRole } from '@shared/types/admin-role';

type RoleWithStaff = Prisma.RoleGetPayload<{
  include: {
    staff: { select: { id: true; name: true; email: true; designation: true; branch: { select: { name: true } } } };
  };
}>;

function toAdminRole(row: RoleWithStaff): AdminRole {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    scope: row.scope,
    description: row.description ?? '',
    permissions: JSON.parse(row.permissions ?? '[]') as string[],
    isSystem: row.isSystem,
    staffCount: row.staff.length,
    members: row.staff.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      designation: s.designation ?? null,
      branchName: s.branch?.name ?? null,
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const staffSelect = {
  id: true,
  name: true,
  email: true,
  designation: true,
  branch: { select: { name: true } },
} as const;

/**
 * GET  /api/v1/admin/roles   — list all roles for the organisation
 * POST /api/v1/admin/roles   — create a new custom role
 */
export const GET = route(async (req) => {
  requireAdminAuth(req);
  const { search, page, limit } = parseQuery(req, adminRoleListQuerySchema);
  const orgId = await resolveOrgId();

  const where: Prisma.RoleWhereInput = {
    orgId,
    ...(search ? { name: { contains: search } } : {}),
  };

  const [rows, total] = await Promise.all([
    db.role.findMany({
      where,
      include: { staff: { select: staffSelect } },
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.role.count({ where }),
  ]);

  return ok(rows.map(toAdminRole), buildMeta(page, limit, total));
});

export const POST = route(async (req) => {
  requireAdminAuth(req);
  const body = await parseBody(req, adminRoleCreateSchema);
  const orgId = await resolveOrgId();

  const key = body.name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');

  try {
    const row = await db.role.create({
      data: {
        orgId,
        name: body.name,
        key,
        scope: body.scope,
        description: body.description ?? '',
        permissions: JSON.stringify(body.permissions),
        isSystem: false,
      },
      include: { staff: { select: staffSelect } },
    });
    return created(toAdminRole(row));
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw Errors.conflict(`A role with the name "${body.name}" already exists.`);
    }
    throw error;
  }
});
