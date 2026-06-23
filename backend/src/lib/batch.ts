import type { Prisma } from '@prisma/client';
import { Errors } from '@/lib/api/errors';

type Tx = Prisma.TransactionClient;

/**
 * Receive a quantity into a batch: upsert the ProductBatch (by product+batchNo)
 * and add to its BatchStock at the warehouse. Returns the batch id so the
 * caller can stamp it on the movement / GRN line. Batch-tracked products only.
 */
export async function receiveBatchStock(
  tx: Tx,
  input: {
    productId: string;
    warehouseId: string;
    branchId: string;
    batchNo: string;
    mfgDate?: Date | null;
    expiryDate?: Date | null;
    supplierId?: string | null;
    quantity: number;
  },
): Promise<string> {
  const batch = await tx.productBatch.upsert({
    where: { productId_batchNo: { productId: input.productId, batchNo: input.batchNo } },
    create: {
      productId: input.productId,
      batchNo: input.batchNo,
      mfgDate: input.mfgDate ?? null,
      expiryDate: input.expiryDate ?? null,
      supplierId: input.supplierId ?? null,
    },
    // Keep the earliest-known expiry/mfg if re-received without dates.
    update: {
      ...(input.expiryDate ? { expiryDate: input.expiryDate } : {}),
      ...(input.mfgDate ? { mfgDate: input.mfgDate } : {}),
    },
  });

  if (input.quantity <= 0) throw Errors.badRequest('Batch receive quantity must be positive.');
  await tx.batchStock.upsert({
    where: { warehouseId_batchId: { warehouseId: input.warehouseId, batchId: batch.id } },
    create: {
      branchId: input.branchId,
      warehouseId: input.warehouseId,
      batchId: batch.id,
      quantity: input.quantity,
    },
    update: { quantity: { increment: input.quantity } },
  });
  return batch.id;
}

/**
 * Deplete `quantity` from a product's batch stock at a warehouse, FEFO
 * (earliest expiry first; null expiry last). Best-effort: stops when the
 * requested quantity is consumed or batch stock is exhausted — BatchStock is a
 * batch breakdown, while product-level InventoryStock remains authoritative.
 * Returns the per-batch quantities actually consumed.
 */
export async function depleteBatchStockFEFO(
  tx: Tx,
  input: { productId: string; warehouseId: string; quantity: number; force?: boolean },
): Promise<Array<{ batchId: string; quantity: number }>> {
  if (input.quantity <= 0) return [];
  const rows = await tx.batchStock.findMany({
    where: {
      warehouseId: input.warehouseId,
      quantity: { gt: 0 },
      batch: { productId: input.productId },
    },
    include: { batch: { select: { expiryDate: true } } },
  });
  // FEFO: earliest expiry first; batches without an expiry go last.
  rows.sort((a, b) => {
    const ax = a.batch.expiryDate?.getTime() ?? Number.POSITIVE_INFINITY;
    const bx = b.batch.expiryDate?.getTime() ?? Number.POSITIVE_INFINITY;
    return ax - bx;
  });

  let remaining = input.quantity;
  const consumed: Array<{ batchId: string; quantity: number }> = [];
  for (const row of rows) {
    if (remaining <= 0) break;
    const take = Math.min(row.quantity, remaining);
    await tx.batchStock.update({
      where: { id: row.id },
      data: { quantity: { decrement: take } },
    });
    consumed.push({ batchId: row.batchId, quantity: take });
    remaining -= take;
  }
  if (remaining > 0 && !input.force) {
    throw Errors.conflict(
      `Insufficient batch stock: could not fulfil ${remaining} unit(s) from tracked batches.`,
    );
  }
  return consumed;
}
