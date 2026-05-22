import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminCancellationCustomerUpdateSchema } from '@shared/schemas/admin-cancellation-customers';
import type { AdminCancellationCustomer } from '@shared/types/admin-cancellation-customer';

interface RouteContext {
  params: { id: string };
}

type RowWithRels = Prisma.CancellationCustomerGetPayload<{
  include: { createdByAdmin: true };
}>;

function toDTO(row: RowWithRels): AdminCancellationCustomer {
  return {
    id: row.id,
    name: row.name,
    mobileNo: row.mobileNo,
    gender: row.gender,
    email: row.email,
    ipAddress: row.ipAddress,
    isActive: row.isActive,
    createdBy: row.createdByAdmin
      ? {
          id: row.createdByAdmin.id,
          name: row.createdByAdmin.name,
          email: row.createdByAdmin.email,
        }
      : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const PUT = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  const body = await parseBody(req, adminCancellationCustomerUpdateSchema);

  try {
    const row = await db.cancellationCustomer.update({
      where: { id: params.id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.mobileNo !== undefined && { mobileNo: body.mobileNo }),
        ...(body.gender !== undefined && { gender: body.gender ?? null }),
        ...(body.email !== undefined && { email: body.email ?? null }),
      },
      include: { createdByAdmin: true },
    });
    return ok(toDTO(row));
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw Errors.notFound('Customer');
    }
    throw error;
  }
});

export const DELETE = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  try {
    await db.cancellationCustomer.delete({ where: { id: params.id } });
    return ok({ deleted: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw Errors.notFound('Customer');
    }
    throw error;
  }
});
