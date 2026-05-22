import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { requireAdminAuth } from '@/lib/auth/service';
import {
  adminReceiptCancellationCreateSchema,
  adminReceiptCancellationListQuerySchema,
} from '@shared/schemas/admin-receipt-cancellations';
import type { AdminReceiptCancellation } from '@shared/types/admin-receipt-cancellation';
import { readClientIp } from '@/lib/client-ip';

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

export const GET = route(async (req) => {
  requireAdminAuth(req);
  const { search, branchId, page, limit } = parseQuery(
    req,
    adminReceiptCancellationListQuerySchema,
  );

  const where: Prisma.ReceiptCancellationWhereInput = {
    ...(branchId && { branchId }),
    ...(search && {
      OR: [
        { customerName: { contains: search } },
        { packageNo: { contains: search } },
        { receiptNo: { contains: search } },
        { remarks: { contains: search } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    db.receiptCancellation.findMany({
      where,
      include: { branch: true, createdByAdmin: true },
      orderBy: { requestDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.receiptCancellation.count({ where }),
  ]);

  return ok(items.map(toDTO), buildMeta(page, limit, total));
});

export const POST = route(async (req) => {
  const claims = requireAdminAuth(req);
  const body = await parseBody(req, adminReceiptCancellationCreateSchema);
  const ip = readClientIp(req);

  const row = await db.receiptCancellation.create({
    data: {
      branchId: body.branchId || null,
      customerName: body.customerName,
      packageNo: body.packageNo ?? null,
      receiptNo: body.receiptNo,
      paidAmount: body.paidAmount,
      remarks: body.remarks ?? null,
      requestDate: new Date(body.requestDate),
      ipAddress: ip,
      isActive: true,
      createdByAdminId: claims.sub,
    },
    include: { branch: true, createdByAdmin: true },
  });
  return created(toDTO(row));
});
