import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { requireAdminAuth } from '@/lib/auth/service';
import {
  adminPackageCancellationCreateSchema,
  adminPackageCancellationListQuerySchema,
} from '@shared/schemas/admin-package-cancellations';
import type { AdminPackageCancellation } from '@shared/types/admin-package-cancellation';
import { readClientIp } from '@/lib/client-ip';

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

export const GET = route(async (req) => {
  requireAdminAuth(req);
  const { search, branchId, page, limit } = parseQuery(
    req,
    adminPackageCancellationListQuerySchema,
  );

  const where: Prisma.PackageCancellationWhereInput = {
    ...(branchId && { branchId }),
    ...(search && {
      OR: [
        { customerName: { contains: search } },
        { packageNo: { contains: search } },
        { remarks: { contains: search } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    db.packageCancellation.findMany({
      where,
      include: { branch: true, createdByAdmin: true },
      orderBy: { requestedDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.packageCancellation.count({ where }),
  ]);

  return ok(items.map(toDTO), buildMeta(page, limit, total));
});

export const POST = route(async (req) => {
  const claims = requireAdminAuth(req);
  const body = await parseBody(req, adminPackageCancellationCreateSchema);
  const ip = readClientIp(req);

  const row = await db.packageCancellation.create({
    data: {
      branchId: body.branchId || null,
      customerName: body.customerName,
      packageNo: body.packageNo,
      amount: body.amount,
      remarks: body.remarks ?? null,
      requestedDate: new Date(body.requestedDate),
      ipAddress: ip,
      isActive: true,
      createdByAdminId: claims.sub,
    },
    include: { branch: true, createdByAdmin: true },
  });
  return created(toDTO(row));
});
