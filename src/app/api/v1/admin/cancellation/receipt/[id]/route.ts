import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminReceiptCancellationUpdateSchema } from '@/lib/admin-receipt-cancellations';
import type { AdminReceiptCancellation } from '@/types/admin-receipt-cancellation';

interface RouteContext {
  params: { id: string };
}

type RowWithRels = Prisma.ReceiptCancellationGetPayload<{
  include: { branch: true; createdByAdmin: true };
}>;

function toDTO(row: RowWithRels): AdminReceiptCancellation {
  return {
    id: row.id,
    branch: row.branch
      ? { id: row.branch.id, name: row.branch.name, code: row.branch.code }
      : null,
    customerName: row.customerName,
    packageNo: row.packageNo,
    receiptNo: row.receiptNo,
    paidAmount: row.paidAmount,
    remarks: row.remarks,
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
  const body = await parseBody(req, adminReceiptCancellationUpdateSchema);
  try {
    const row = await db.receiptCancellation.update({
      where: { id: params.id },
      data: {
        ...(body.branchId !== undefined && { branchId: body.branchId || null }),
        ...(body.customerName !== undefined && { customerName: body.customerName }),
        ...(body.packageNo !== undefined && { packageNo: body.packageNo ?? null }),
        ...(body.receiptNo !== undefined && { receiptNo: body.receiptNo }),
        ...(body.paidAmount !== undefined && { paidAmount: body.paidAmount }),
        ...(body.remarks !== undefined && { remarks: body.remarks ?? null }),
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
      throw Errors.notFound('Receipt cancellation');
    }
    throw error;
  }
});

export const DELETE = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  try {
    await db.receiptCancellation.delete({ where: { id: params.id } });
    return ok({ deleted: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw Errors.notFound('Receipt cancellation');
    }
    throw error;
  }
});
