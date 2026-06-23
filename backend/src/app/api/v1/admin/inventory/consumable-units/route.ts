import { db } from '@/lib/db';
import { route, parseQuery } from '@/lib/api/handler';
import { ok, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { z } from 'zod';

const querySchema = z.object({
  branchId: z.string().min(1),
  productId: z.string().optional(),
  status: z.enum(['sealed', 'open', 'exhausted', 'discarded', 'active']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
});

export const GET = route(async (req) => {
  requireAdminAuth(req);
  const { branchId, productId, status, page, limit } = parseQuery(req, querySchema);

  const branch = await db.branch.findUnique({ where: { id: branchId }, select: { id: true } });
  if (!branch) throw Errors.notFound('Branch');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { branchId };
  if (productId) where.productId = productId;
  if (status === 'active') {
    where.status = { in: ['sealed', 'open'] };
  } else if (status) {
    where.status = status;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [units, total] = await Promise.all([
    (db as any).consumableUnit.findMany({
      where,
      include: {
        product: { select: { id: true, sku: true, name: true, uom: true, consumptionUom: true, unitsPerPurchase: true } },
        grn: { select: { id: true, number: true, receivedAt: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    (db as any).consumableUnit.count({ where }),
  ]);

  const rows = (units as any[]).map((u: any) => ({
    id: u.id,
    productId: u.productId,
    productSku: u.product.sku,
    productName: u.product.name,
    purchaseUom: u.product.uom,
    consumptionUom: u.product.consumptionUom ?? u.product.uom,
    totalCapacity: u.totalCapacity,
    usedQuantity: u.usedQuantity,
    remaining: u.totalCapacity - u.usedQuantity,
    percentUsed: u.totalCapacity > 0 ? Math.round((u.usedQuantity / u.totalCapacity) * 100) : 0,
    status: u.status,
    openedAt: u.openedAt ? (u.openedAt as Date).toISOString() : null,
    exhaustedAt: u.exhaustedAt ? (u.exhaustedAt as Date).toISOString() : null,
    createdAt: (u.createdAt as Date).toISOString(),
    grnId: u.grnId,
    grnNumber: u.grn?.number ?? null,
    grnReceivedAt: u.grn?.receivedAt ? (u.grn.receivedAt as Date).toISOString() : null,
  }));

  return ok(rows, buildMeta(page, limit, total));
});
