import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminPackageCancellationUpdateSchema } from '@/lib/admin-package-cancellations';
import type { AdminPackageCancellation } from '@/types/admin-package-cancellation';

interface RouteContext {
  params: { id: string };
}

type RowWithRels = Prisma.PackageCancellationGetPayload<{
  include: { branch: true; createdByAdmin: true };
}>;

function toDTO(row: RowWithRels): AdminPackageCancellation {
  return {
    id: row.id,
    branch: row.branch
      ? { id: row.branch.id, name: row.branch.name, code: row.branch.code }
      : null,
    customerName: row.customerName,
    packageNo: row.packageNo,
    amount: row.amount,
    remarks: row.remarks,
    requestedDate: row.requestedDate.toISOString(),
    status: row.status,
    ipAddress: row.ipAddress,
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
  const body = await parseBody(req, adminPackageCancellationUpdateSchema);
  try {
    const row = await db.packageCancellation.update({
      where: { id: params.id },
      data: {
        ...(body.branchId !== undefined && { branchId: body.branchId || null }),
        ...(body.customerName !== undefined && { customerName: body.customerName }),
        ...(body.packageNo !== undefined && { packageNo: body.packageNo }),
        ...(body.amount !== undefined && { amount: body.amount }),
        ...(body.remarks !== undefined && { remarks: body.remarks ?? null }),
        ...(body.requestedDate !== undefined && {
          requestedDate: new Date(body.requestedDate),
        }),
      },
      include: { branch: true, createdByAdmin: true },
    });
    return ok(toDTO(row));
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw Errors.notFound('Package cancellation');
    }
    throw error;
  }
});

export const DELETE = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  try {
    await db.packageCancellation.delete({ where: { id: params.id } });
    return ok({ deleted: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw Errors.notFound('Package cancellation');
    }
    throw error;
  }
});
