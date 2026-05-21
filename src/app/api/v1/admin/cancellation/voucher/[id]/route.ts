import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminVoucherCancellationUpdateSchema } from '@/lib/admin-voucher-cancellations';
import type { AdminVoucherCancellation } from '@/types/admin-voucher-cancellation';

interface RouteContext {
  params: { id: string };
}

type RowWithRels = Prisma.VoucherCancellationGetPayload<{
  include: { branch: true; createdByAdmin: true };
}>;

function toDTO(row: RowWithRels): AdminVoucherCancellation {
  return {
    id: row.id,
    branch: row.branch
      ? { id: row.branch.id, name: row.branch.name, code: row.branch.code }
      : null,
    expenseType: row.expenseType,
    amount: row.amount,
    remarks: row.remarks,
    cancelReason: row.cancelReason,
    requestDate: row.requestDate.toISOString(),
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
  const body = await parseBody(req, adminVoucherCancellationUpdateSchema);
  try {
    const row = await db.voucherCancellation.update({
      where: { id: params.id },
      data: {
        ...(body.branchId !== undefined && { branchId: body.branchId || null }),
        ...(body.expenseType !== undefined && { expenseType: body.expenseType }),
        ...(body.amount !== undefined && { amount: body.amount }),
        ...(body.remarks !== undefined && { remarks: body.remarks ?? null }),
        ...(body.cancelReason !== undefined && {
          cancelReason: body.cancelReason ?? null,
        }),
        ...(body.requestDate !== undefined && {
          requestDate: new Date(body.requestDate),
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
      throw Errors.notFound('Voucher cancellation');
    }
    throw error;
  }
});

export const DELETE = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  try {
    await db.voucherCancellation.delete({ where: { id: params.id } });
    return ok({ deleted: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw Errors.notFound('Voucher cancellation');
    }
    throw error;
  }
});
