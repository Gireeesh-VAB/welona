import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { requireAdminAuth } from '@/lib/auth/service';
import {
  adminCancellationCustomerCreateSchema,
  adminCancellationCustomerListQuerySchema,
} from '@shared/schemas/admin-cancellation-customers';
import type { AdminCancellationCustomer } from '@shared/types/admin-cancellation-customer';
import { readClientIp } from '@/lib/client-ip';

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

export const GET = route(async (req) => {
  requireAdminAuth(req);
  const { search, page, limit } = parseQuery(
    req,
    adminCancellationCustomerListQuerySchema,
  );

  const where: Prisma.CancellationCustomerWhereInput = search
    ? {
        OR: [
          { name: { contains: search } },
          { mobileNo: { contains: search } },
          { email: { contains: search } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    db.cancellationCustomer.findMany({
      where,
      include: { createdByAdmin: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.cancellationCustomer.count({ where }),
  ]);

  return ok(items.map(toDTO), buildMeta(page, limit, total));
});

export const POST = route(async (req) => {
  const claims = requireAdminAuth(req);
  const body = await parseBody(req, adminCancellationCustomerCreateSchema);
  const ip = readClientIp(req);

  const row = await db.cancellationCustomer.create({
    data: {
      name: body.name,
      mobileNo: body.mobileNo,
      gender: body.gender ?? null,
      email: body.email ?? null,
      ipAddress: ip,
      isActive: true,
      createdByAdminId: claims.sub,
    },
    include: { createdByAdmin: true },
  });
  return created(toDTO(row));
});
