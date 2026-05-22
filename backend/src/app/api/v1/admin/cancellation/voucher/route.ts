import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { requireAdminAuth } from '@/lib/auth/service';
import {
  adminVoucherCancellationCreateSchema,
  adminVoucherCancellationListQuerySchema,
} from '@shared/schemas/admin-voucher-cancellations';
import type { AdminVoucherCancellation } from '@shared/types/admin-voucher-cancellation';
import { readClientIp } from '@/lib/client-ip';

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

export const GET = route(async (req) => {
  requireAdminAuth(req);
  const { search, branchId, expenseType, page, limit } = parseQuery(
    req,
    adminVoucherCancellationListQuerySchema,
  );

  const where: Prisma.VoucherCancellationWhereInput = {
    ...(branchId && { branchId }),
    ...(expenseType && { expenseType }),
    ...(search && {
      OR: [
        { expenseType: { contains: search } },
        { remarks: { contains: search } },
        { cancelReason: { contains: search } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    db.voucherCancellation.findMany({
      where,
      include: { branch: true, createdByAdmin: true },
      orderBy: { requestDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.voucherCancellation.count({ where }),
  ]);

  return ok(items.map(toDTO), buildMeta(page, limit, total));
});

export const POST = route(async (req) => {
  const claims = requireAdminAuth(req);
  const body = await parseBody(req, adminVoucherCancellationCreateSchema);
  const ip = readClientIp(req);

  const row = await db.voucherCancellation.create({
    data: {
      branchId: body.branchId || null,
      expenseType: body.expenseType,
      amount: body.amount,
      remarks: body.remarks ?? null,
      cancelReason: body.cancelReason ?? null,
      requestDate: body.requestDate ? new Date(body.requestDate) : new Date(),
      ipAddress: ip,
      isActive: true,
      createdByAdminId: claims.sub,
    },
    include: { branch: true, createdByAdmin: true },
  });
  return created(toDTO(row));
});
