import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { route, parseQuery } from '@/lib/api/handler';
import { ok, buildMeta } from '@/lib/api/response';
import { requireAdminOrBranchAuth } from '@/lib/auth/service';
import type { AdminBatchRow } from '@shared/types/admin-batch';

const querySchema = z.object({
  branchId: z.string().optional(),
  productId: z.string().optional(),
  search: z.string().trim().optional(),
  /** Only batches that still have stock somewhere in scope. */
  inStockOnly: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
});

/**
 * GET /api/v1/admin/inventory/batches?branchId=&productId=&search=&inStockOnly=
 *
 * Lists product batches with their on-hand quantity (summed from BatchStock,
 * optionally scoped to a branch) and expiry. Branch sessions are scoped.
 */
export const GET = route(async (req) => {
  const { branchScope } = requireAdminOrBranchAuth(req);
  const { branchId: queryBranchId, productId, search, inStockOnly, page, limit } = parseQuery(
    req,
    querySchema,
  );
  const branchId = branchScope ?? queryBranchId;

  const where: Prisma.ProductBatchWhereInput = {
    ...(productId && { productId }),
    ...(search && {
      OR: [
        { batchNo: { contains: search } },
        { product: { name: { contains: search } } },
        { product: { sku: { contains: search } } },
      ],
    }),
  };

  const [batches, total] = await Promise.all([
    db.productBatch.findMany({
      where,
      include: {
        product: { select: { sku: true, name: true } },
        stocks: branchId ? { where: { branchId } } : true,
      },
      orderBy: [{ expiryDate: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.productBatch.count({ where }),
  ]);

  const nowMs = Date.now();
  let rows: AdminBatchRow[] = batches.map((b) => {
    const quantity = b.stocks.reduce((sum, s) => sum + s.quantity, 0);
    return {
      id: b.id,
      productId: b.productId,
      sku: b.product.sku,
      name: b.product.name,
      batchNo: b.batchNo,
      mfgDate: b.mfgDate ? b.mfgDate.toISOString() : null,
      expiryDate: b.expiryDate ? b.expiryDate.toISOString() : null,
      quantity,
      daysToExpiry: b.expiryDate
        ? Math.floor((b.expiryDate.getTime() - nowMs) / (24 * 60 * 60 * 1000))
        : null,
    };
  });
  if (inStockOnly) rows = rows.filter((r) => r.quantity > 0);

  return ok(rows, buildMeta(page, limit, total));
});
