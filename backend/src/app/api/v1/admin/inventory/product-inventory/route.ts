import { db } from '@/lib/db';
import { route, parseQuery } from '@/lib/api/handler';
import { ok, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminProductInventoryQuerySchema } from '@shared/schemas/admin-inventory';
import type { AdminProductInventoryRow } from '@shared/types/admin-service-inventory';

/**
 * GET /api/v1/admin/inventory/product-inventory?branchId=&search=&categoryId=&stockStatus=
 *
 * Combines product master data (prices, category, tax, UOM, batch flags) with
 * current on-hand quantity for the requested branch.  Useful as a single-screen
 * product + stock overview without having to cross-reference the stock and
 * master pages separately.
 */
export const GET = route(async (req) => {
  requireAdminAuth(req);
  const { branchId, search, categoryId, stockStatus, page, limit } =
    parseQuery(req, adminProductInventoryQuerySchema);

  const branch = await db.branch.findUnique({ where: { id: branchId }, select: { id: true } });
  if (!branch) throw Errors.notFound('Branch');

  // Branch catalog: if the branch has explicit product assignments restrict to them
  const assigned = await db.branchProduct.findMany({
    where: { branchId },
    select: { productId: true },
  });
  const assignedIds = assigned.map((a) => a.productId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const productWhere: any = {
    isActive: true,
    ...(assignedIds.length > 0 && { id: { in: assignedIds } }),
    ...(categoryId && { categoryId }),
    ...(search && {
      OR: [
        { name: { contains: search } },
        { sku: { contains: search } },
        { brand: { contains: search } },
        { barcode: { contains: search } },
      ],
    }),
  };

  const [products, stocks, lastMovements] = await Promise.all([
    db.product.findMany({
      where: productWhere,
      include: { category: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    }),
    db.inventoryStock.findMany({
      where: { branchId },
      select: { productId: true, quantity: true },
    }),
    db.inventoryMovement.groupBy({
      by: ['productId'],
      where: { branchId },
      _max: { createdAt: true },
    }),
  ]);

  const stockMap = new Map<string, number>();
  for (const s of stocks) {
    stockMap.set(s.productId, (stockMap.get(s.productId) ?? 0) + s.quantity);
  }
  const lastMap = new Map(
    lastMovements.map((m) => [m.productId, m._max.createdAt ?? null]),
  );

  let rows: AdminProductInventoryRow[] = products.map((p) => {
    const qty = stockMap.get(p.id) ?? 0;
    return {
      productId: p.id,
      sku: p.sku,
      name: p.name,
      brand: p.brand,
      categoryId: p.categoryId,
      categoryName: (p as any).category?.name ?? null,
      uom: p.uom,
      mrp: p.mrp,
      salePrice: p.salePrice,
      purchasePrice: p.purchasePrice,
      taxPercent: p.taxPercent,
      reorderLevel: p.reorderLevel,
      quantity: qty,
      isLowStock: p.reorderLevel > 0 && qty <= p.reorderLevel && qty > 0,
      trackBatches: p.trackBatches,
      isActive: p.isActive,
      lastMovementAt: (lastMap.get(p.id) ?? null)
        ? (lastMap.get(p.id) as Date).toISOString()
        : null,
    };
  });

  // Apply stock-status filter
  if (stockStatus === 'out_of_stock') {
    rows = rows.filter((r) => r.quantity <= 0);
  } else if (stockStatus === 'low_stock') {
    rows = rows.filter((r) => r.isLowStock);
  } else if (stockStatus === 'in_stock') {
    rows = rows.filter((r) => r.quantity > 0 && !r.isLowStock);
  }

  const total = rows.length;
  const start = (page - 1) * limit;
  const paged = rows.slice(start, start + limit);

  return ok(paged, buildMeta(page, limit, total));
});
