import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseQuery } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminInventoryReportQuerySchema } from '@shared/schemas/admin-inventory-reports';
import type {
  AdminInventoryProductReportRow,
  AdminInventoryReportSummary,
  MovementClass,
} from '@shared/types/admin-inventory-report';

/**
 * GET /api/v1/admin/inventory/reports?branchId=&days=&fastThreshold=
 *
 * Read-only analytics over the existing stock + movement data:
 *  - summary KPIs (units, valuation, low/out-of-stock, sold/purchased in window)
 *  - per-product rows with valuation and a fast/slow/dead movement class.
 * Branch sessions are scoped to their own branch; admins may pass a branchId or
 * omit it for an org-wide view.
 */
export const GET = route(async (req) => {
  requireAdminAuth(req);
  const { branchId: queryBranchId, days, fastThreshold } = parseQuery(
    req,
    adminInventoryReportQuerySchema,
  );
  const branchId = queryBranchId;
  const windowStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const stockWhere: Prisma.InventoryStockWhereInput = branchId ? { branchId } : {};
  const movementWhere: Prisma.InventoryMovementWhereInput = {
    ...(branchId && { branchId }),
    createdAt: { gte: windowStart },
    type: { in: ['sale', 'purchase'] },
  };

  const [products, stocks, movements] = await Promise.all([
    db.product.findMany({
      where: { isActive: true },
      select: { id: true, sku: true, name: true, brand: true, reorderLevel: true, purchasePrice: true },
      orderBy: { name: 'asc' },
    }),
    db.inventoryStock.findMany({ where: stockWhere, select: { productId: true, quantity: true } }),
    db.inventoryMovement.groupBy({
      by: ['productId', 'type'],
      where: movementWhere,
      _sum: { delta: true },
    }),
  ]);

  const qtyOf = new Map<string, number>();
  for (const s of stocks) qtyOf.set(s.productId, (qtyOf.get(s.productId) ?? 0) + s.quantity);

  const soldOf = new Map<string, number>();
  const purchasedOf = new Map<string, number>();
  for (const m of movements) {
    const sum = m._sum.delta ?? 0;
    // Sale deltas are negative (returns are positive `sale` deltas); net units
    // sold = max(0, -sum). Purchases are positive.
    if (m.type === 'sale') soldOf.set(m.productId, Math.max(0, -sum));
    if (m.type === 'purchase') purchasedOf.set(m.productId, Math.max(0, sum));
  }

  let totalUnits = 0;
  let valuation = 0;
  let lowStock = 0;
  let outOfStock = 0;
  let soldUnits = 0;
  let purchasedUnits = 0;

  const rows: AdminInventoryProductReportRow[] = products.map((p) => {
    const quantity = qtyOf.get(p.id) ?? 0;
    const sold = soldOf.get(p.id) ?? 0;
    const purchased = purchasedOf.get(p.id) ?? 0;
    const rowValuation = quantity * p.purchasePrice;
    const isLowStock = p.reorderLevel > 0 && quantity <= p.reorderLevel;
    const movementClass: MovementClass = sold === 0 ? 'dead' : sold >= fastThreshold ? 'fast' : 'slow';

    totalUnits += quantity;
    valuation += rowValuation;
    if (isLowStock) lowStock += 1;
    if (quantity === 0) outOfStock += 1;
    soldUnits += sold;
    purchasedUnits += purchased;

    return {
      productId: p.id,
      sku: p.sku,
      name: p.name,
      brand: p.brand,
      quantity,
      reorderLevel: p.reorderLevel,
      isLowStock,
      valuation: rowValuation,
      soldUnits: sold,
      purchasedUnits: purchased,
      movementClass,
    };
  });

  const summary: AdminInventoryReportSummary = {
    products: products.length,
    totalUnits,
    valuation,
    lowStock,
    outOfStock,
    soldUnits,
    purchasedUnits,
    windowDays: days,
  };

  return ok({ summary, products: rows });
});
