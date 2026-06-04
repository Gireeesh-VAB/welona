import type { Db } from './service';
import { getDefaultWarehouseId } from '@/lib/warehouse';
import { depleteBatchStockFEFO } from '@/lib/batch';

export interface DeliveryStockLine {
  orderItemId: string;
  quantity: number;
}

/**
 * Apply (or reverse) inventory for a delivery's PRODUCT lines.
 *
 * On delivery completion this writes a `sale` movement (negative delta) per
 * product line, reducing stock at the order branch's default warehouse. On a
 * return, `reverse` adds the stock back (positive delta, reason "Sales return").
 *
 * Service / free-text lines (OrderItem.productId = null) have no stock impact
 * and are skipped. A null branch is skipped (no warehouse to resolve).
 */
export async function applyDeliverySaleStock(
  tx: Db,
  opts: { branchId: string | null; lines: DeliveryStockLine[]; ref: string; reverse?: boolean },
): Promise<void> {
  const { branchId, lines, ref, reverse = false } = opts;
  if (!branchId || lines.length === 0) return;

  const items = await tx.orderItem.findMany({
    where: { id: { in: lines.map((l) => l.orderItemId) } },
    select: { id: true, productId: true },
  });
  const productOf = new Map(items.map((i) => [i.id, i.productId]));
  const productIds = items.map((i) => i.productId).filter((p): p is string => Boolean(p));
  const batchTracked = new Set(
    productIds.length
      ? (
          await tx.product.findMany({
            where: { id: { in: productIds }, trackBatches: true },
            select: { id: true },
          })
        ).map((p) => p.id)
      : [],
  );

  // Only resolve a warehouse if at least one line is a real product.
  const hasProduct = lines.some((l) => productOf.get(l.orderItemId));
  if (!hasProduct) return;
  const warehouseId = await getDefaultWarehouseId(tx, branchId);

  for (const line of lines) {
    const productId = productOf.get(line.orderItemId);
    if (!productId) continue;
    const delta = reverse ? line.quantity : -line.quantity;
    const stock = await tx.inventoryStock.upsert({
      where: { warehouseId_productId: { warehouseId, productId } },
      create: { branchId, warehouseId, productId, quantity: 0 },
      update: {},
    });
    await tx.inventoryStock.update({
      where: { id: stock.id },
      data: { quantity: stock.quantity + delta },
    });
    // Batch-tracked forward sale: deplete batches FEFO. (Returns don't re-add to
    // a specific batch — InventoryStock stays authoritative.)
    if (!reverse && batchTracked.has(productId)) {
      await depleteBatchStockFEFO(tx, { productId, warehouseId, quantity: line.quantity });
    }
    await tx.inventoryMovement.create({
      data: {
        branchId,
        warehouseId,
        productId,
        type: 'sale',
        delta,
        reason: reverse ? 'Sales return' : 'Sale (delivery)',
        ref,
        createdByAdminId: null,
      },
    });
  }
}
