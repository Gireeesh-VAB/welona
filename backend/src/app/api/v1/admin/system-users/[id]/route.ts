import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminSystemUserUpdateSchema } from '@shared/schemas/admin-system-users';
import { toAdminSystemUser } from '@/lib/admin-system-user-mapper';

interface RouteContext {
  params: { id: string };
}

const fullInclude = {
  branch: true,
  employee: true,
  createdByAdmin: true,
} satisfies Prisma.SystemUserInclude;

export const PUT = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  const body = await parseBody(req, adminSystemUserUpdateSchema);

  const passwordHash =
    body.password !== undefined ? await bcrypt.hash(body.password, 10) : undefined;

  try {
    const row = await db.systemUser.update({
      where: { id: params.id },
      data: {
        ...(body.userName !== undefined && { userName: body.userName }),
        ...(passwordHash !== undefined && { passwordHash }),
        ...(body.email !== undefined && { email: body.email ?? null }),
        ...(body.employeeId !== undefined && { employeeId: body.employeeId || null }),
        ...(body.branchId !== undefined && { branchId: body.branchId || null }),
      },
      include: fullInclude,
    });
    return ok(toAdminSystemUser(row));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') throw Errors.notFound('User');
      if (error.code === 'P2002') throw Errors.conflict('User name is already taken.');
    }
    throw error;
  }
});

export const DELETE = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  try {
    await db.systemUser.delete({ where: { id: params.id } });
    return ok({ deleted: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw Errors.notFound('User');
    }
    throw error;
  }
});
