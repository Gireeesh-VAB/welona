import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseQuery } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { requireAdminOrBranchAuth } from '@/lib/auth/service';
import { z } from 'zod';
import type {
  AdminInventoryAlerts,
  ExpiryAlertRow,
  OverduePurchaseOrder,
  StockAlertRow,
} from '@shared/types/admin-inventory-alert';

const querySchema = z.object({
  branchId: z.string().optional(),
  expiryDays: z.coerce.number().int().positive().max(365).default(60),
});

/**
 * GET /api/v1/admin/inventory/alerts?branchId=
 *
 * In-app inventory alerts, computed on read (no stored notifications):
 *  - low-stock  : reorderLevel > 0 and 0 < qty ≤ reorderLevel
 *  - out-of-stock: reorderLevel > 0 and qty = 0
 *  - overdue POs : sent / partially_received with an expectedAt in the past
 * Branch sessions are scoped to their own branch. (Expiry alerts arrive with
 * batch tracking in a later phase.)
 */
export const GET = route(async (req) => {
  const { branchScope } = requireAdminOrBranchAuth(req);
  const { branchId: queryBranchId, expiryDays } = parseQuery(req, querySchema);
  const branchId = branchScope ?? queryBranchId;

  const stockWhere: Prisma.InventoryStockWhereInput = branchId ? { branchId } : {};
  const [stocks, products, branches, overduePOs] = await Promise.all([
    db.inventoryStock.findMany({ where: stockWhere, select: { branchId: true, productId: true, quantity: true } }),
    db.product.findMany({ where: { isActive: true }, select: { id: true, sku: true, name: true, reorderLevel: true } }),
    db.branch.findMany({ select: { id: true, name: true } }),
    db.purchaseOrder.findMany({
      where: {
        ...(branchId && { branchId }),
        status: { in: ['sent', 'partially_received'] },
        expectedAt: { lt: new Date() },
      },
      include: { supplier: true, branch: true },
      orderBy: { expectedAt: 'asc' },
    }),
  ]);

  const productOf = new Map(products.map((p) => [p.id, p]));
  const branchOf = new Map(branches.map((b) => [b.id, b.name]));

  // Roll up quantity per (branch, product) across warehouses.
  const qtyOf = new Map<string, number>();
  for (const s of stocks) {
    const key = `${s.branchId}|${s.productId}`;
    qtyOf.set(key, (qtyOf.get(key) ?? 0) + s.quantity);
  }

  const lowStock: StockAlertRow[] = [];
  const outOfStock: StockAlertRow[] = [];
  for (const [key, quantity] of qtyOf) {
    const [bId, pId] = key.split('|');
    const product = productOf.get(pId);
    if (!product || product.reorderLevel <= 0) continue;
    if (quantity > product.reorderLevel) continue;
    const row: StockAlertRow = {
      branchId: bId,
      branchName: branchOf.get(bId) ?? '—',
      productId: pId,
      sku: product.sku,
      name: product.name,
      quantity,
      reorderLevel: product.reorderLevel,
    };
    (quantity === 0 ? outOfStock : lowStock).push(row);
  }
  const byQty = (a: StockAlertRow, b: StockAlertRow) => a.quantity - b.quantity;
  lowStock.sort(byQty);
  outOfStock.sort(byQty);

  // Near-expiry / expired batches with remaining stock.
  const horizon = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
  const batchStocks = await db.batchStock.findMany({
    where: {
      ...(branchId && { branchId }),
      quantity: { gt: 0 },
      batch: { expiryDate: { not: null, lte: horizon } },
    },
    include: { batch: { include: { product: { select: { sku: true, name: true } } } } },
  });
  const nowMs = Date.now();
  const expiryRows: ExpiryAlertRow[] = batchStocks.map((bs) => {
    const exp = bs.batch.expiryDate as Date;
    return {
      productId: bs.batch.productId,
      sku: bs.batch.product.sku,
      name: bs.batch.product.name,
      batchNo: bs.batch.batchNo,
      branchName: branchOf.get(bs.branchId) ?? '—',
      quantity: bs.quantity,
      expiryDate: exp.toISOString(),
      daysToExpiry: Math.floor((exp.getTime() - nowMs) / (24 * 60 * 60 * 1000)),
    };
  });
  expiryRows.sort((a, b) => a.daysToExpiry - b.daysToExpiry);
  const expired = expiryRows.filter((r) => r.daysToExpiry < 0);
  const nearExpiry = expiryRows.filter((r) => r.daysToExpiry >= 0);

  const now = Date.now();
  const overdue: OverduePurchaseOrder[] = overduePOs.map((po) => ({
    id: po.id,
    number: po.number,
    supplierName: po.supplier.name,
    branchName: po.branch.name,
    status: po.status,
    expectedAt: (po.expectedAt as Date).toISOString(),
    daysOverdue: Math.floor((now - (po.expectedAt as Date).getTime()) / (24 * 60 * 60 * 1000)),
  }));

  const payload: AdminInventoryAlerts = {
    lowStock,
    outOfStock,
    overduePurchaseOrders: overdue,
    nearExpiry,
    expired,
    counts: {
      lowStock: lowStock.length,
      outOfStock: outOfStock.length,
      overduePurchaseOrders: overdue.length,
      nearExpiry: nearExpiry.length,
      expired: expired.length,
    },
  };
  return ok(payload);
});
