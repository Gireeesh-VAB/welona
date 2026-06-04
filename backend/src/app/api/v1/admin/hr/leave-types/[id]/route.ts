import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminLeaveTypeUpdateSchema } from '@shared/schemas/admin-leave-types';
import { toAdminLeaveType } from '@/lib/admin-leave-type-mapper';

interface RouteContext {
  params: { id: string };
}

export const PUT = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  const body = await parseBody(req, adminLeaveTypeUpdateSchema);

  try {
    const row = await db.leaveType.update({
      where: { id: params.id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.code !== undefined && { code: body.code }),
        ...(body.daysPerYear !== undefined && { daysPerYear: body.daysPerYear }),
        ...(body.paid !== undefined && { paid: body.paid }),
        ...(body.description !== undefined && { description: body.description ?? null }),
      },
      include: { createdByAdmin: true },
    });
    return ok(toAdminLeaveType(row));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') throw Errors.notFound('Leave type');
      if (error.code === 'P2002') {
        throw Errors.conflict('A leave type with this name or code already exists.');
      }
    }
    throw error;
  }
});

export const DELETE = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  try {
    await db.leaveType.delete({ where: { id: params.id } });
    return ok({ deleted: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') throw Errors.notFound('Leave type');
      if (error.code === 'P2003') {
        throw Errors.conflict(
          'This leave type is used by existing applications or balances and cannot be deleted.',
        );
      }
    }
    throw error;
  }
});
