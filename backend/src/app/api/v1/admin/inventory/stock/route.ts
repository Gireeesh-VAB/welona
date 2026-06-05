import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseQuery } from '@/lib/api/handler';
import { ok, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminInventoryStockQuerySchema } from '@shared/schemas/admin-inventory';
import type { AdminInventoryStockRow } from '@shared/types/admin-inventory';
import type { ProductUom } from '@shared/enums';

/**
 * GET /api/v1/admin/inventory/stock?branchId=&search=&lowStockOnly=
 *
 * One row per active product. Products that have never been stocked for
 * this branch still appear (quantity 0), so the admin can record an
 * opening movement without having to "register" a product first.
 */
export const GET = route(async (req) => {
  requireAdminAuth(req);
  const { branchId: queryBranchId, warehouseId, search, lowStockOnly, page, limit } = parseQuery(
    req,
    adminInventoryStockQuerySchema,
  );
  // Branch sessions are locked to their own branch regardless of the query.
  const branchId = queryBranchId;

  const branch = await db.branch.findUnique({ where: { id: branchId }, select: { id: true } });
  if (!branch) throw Errors.notFound('Branch');

  // Branch catalog (availability toggle): if the branch has explicit product
  // assignments, restrict the stock list to them. A branch with no assignments
  // is treated as "carries everything" so unconfigured branches keep working.
  const assigned = await db.branchProduct.findMany({
    where: { branchId },
    select: { productId: true },
  });
  const assignedIds = assigned.map((a) => a.productId);

  const productWhere: Prisma.ProductWhereInput = {
    isActive: true,
    ...(assignedIds.length > 0 && { id: { in: assignedIds } }),
    ...(search && {
      OR: [
        { name: { contains: search } },
        { sku: { contains: search } },
        { brand: { contains: search } },
        { barcode: { contains: search } },
      ],
    }),
  };

  // Stock is held per (warehouse, product). Sum across the branch's warehouses
  // for a branch-wide rollup, or scope to one warehouse when `warehouseId` set.
  const stockWhere: Prisma.InventoryStockWhereInput = warehouseId
    ? { branchId, warehouseId }
    : { branchId };
  const movementWhere: Prisma.InventoryMovementWhereInput = warehouseId
    ? { branchId, warehouseId }
    : { branchId };

  const [products, stocks, lastMovements] = await Promise.all([
    db.product.findMany({
      where: productWhere,
      orderBy: [{ name: 'asc' }],
    }),
    db.inventoryStock.findMany({
      where: stockWhere,
      select: { productId: true, quantity: true },
    }),
    db.inventoryMovement.groupBy({
      by: ['productId'],
      where: movementWhere,
      _max: { createdAt: true },
    }),
  ]);

  // Sum quantities per product across warehouses.
  const stockMap = new Map<string, number>();
  for (const s of stocks) {
    stockMap.set(s.productId, (stockMap.get(s.productId) ?? 0) + s.quantity);
  }
  const lastMap = new Map(lastMovements.map((m) => [m.productId, m._max.createdAt ?? null]));

  let rows: AdminInventoryStockRow[] = products.map((p) => {
    const qty = stockMap.get(p.id) ?? 0;
    return {
      productId: p.id,
      sku: p.sku,
      name: p.name,
      brand: p.brand,
      uom: p.uom as ProductUom,
      reorderLevel: p.reorderLevel,
      quantity: qty,
      isLowStock: p.reorderLevel > 0 && qty <= p.reorderLevel,
      lastMovementAt: (lastMap.get(p.id) ?? null) ? (lastMap.get(p.id) as Date).toISOString() : null,
    };
  });

  if (lowStockOnly) rows = rows.filter((r) => r.isLowStock);

  const total = rows.length;
  const start = (page - 1) * limit;
  const paged = rows.slice(start, start + limit);

  return ok(paged, buildMeta(page, limit, total));
});
