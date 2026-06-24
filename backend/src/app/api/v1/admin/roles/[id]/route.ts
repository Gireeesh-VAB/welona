import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminRoleUpdateSchema } from '@shared/schemas/admin-roles';
import type { AdminRole } from '@shared/types/admin-role';

interface RouteContext {
  params: { id: string };
}

const staffSelect = {
  id: true,
  name: true,
  email: true,
  designation: true,
  branch: { select: { name: true } },
} as const;

type RoleWithStaff = Prisma.RoleGetPayload<{ include: { staff: { select: typeof staffSelect } } }>;

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

/**
 * PUT    /api/v1/admin/roles/:id  — update name / description / permissions
 * DELETE /api/v1/admin/roles/:id  — delete a non-system role with no staff
 */
export const PUT = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  const body = await parseBody(req, adminRoleUpdateSchema);

  try {
    const existing = await db.role.findUnique({ where: { id: params.id } });
    if (!existing) throw Errors.notFound('Role');
    if (existing.isSystem) throw Errors.badRequest('System roles cannot be modified.');

    const row = await db.role.update({
      where: { id: params.id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.permissions !== undefined && { permissions: JSON.stringify(body.permissions) }),
      },
      include: { staff: { select: staffSelect } },
    });
    return ok(toAdminRole(row));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') throw Errors.notFound('Role');
      if (error.code === 'P2002') throw Errors.conflict('A role with this name already exists.');
    }
    throw error;
  }
});

export const DELETE = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  try {
    const role = await db.role.findUnique({
      where: { id: params.id },
      include: { _count: { select: { staff: true } } },
    });
    if (!role) throw Errors.notFound('Role');
    if (role.isSystem) throw Errors.badRequest('System roles cannot be deleted.');
    if (role._count.staff > 0) {
      throw Errors.badRequest(
        `${role._count.staff} staff member(s) are still assigned this role. Reassign them first.`,
      );
    }
    await db.role.delete({ where: { id: params.id } });
    return ok({ deleted: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw Errors.notFound('Role');
    }
    throw error;
  }
});
