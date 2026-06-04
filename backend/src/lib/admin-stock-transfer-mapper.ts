import { Prisma } from '@prisma/client';
import type { AdminStockTransfer } from '@shared/types/admin-stock-transfer';
import type { ProductUom, StockTransferStatus } from '@shared/enums';

/** Relations every stock-transfer endpoint loads. (Kept out of route.ts —
 * Next route modules may only export request handlers.) */
export const stockTransferInclude = {
  fromBranch: true,
  toBranch: true,
  createdByAdmin: true,
  items: { include: { product: true } },
} satisfies Prisma.StockTransferInclude;

export type StockTransferWithRelations = Prisma.StockTransferGetPayload<{
  include: {
    fromBranch: true;
    toBranch: true;
    createdByAdmin: true;
    items: { include: { product: true } };
  };
}>;

export function toAdminStockTransfer(row: StockTransferWithRelations): AdminStockTransfer {
  return {
    id: row.id,
    number: row.number,
    status: row.status as StockTransferStatus,
    fromBranch: { id: row.fromBranch.id, name: row.fromBranch.name, code: row.fromBranch.code },
    toBranch: { id: row.toBranch.id, name: row.toBranch.name, code: row.toBranch.code },
    dispatchedAt: row.dispatchedAt ? row.dispatchedAt.toISOString() : null,
    receivedAt: row.receivedAt ? row.receivedAt.toISOString() : null,
    notes: row.notes,
    items: row.items.map((it) => ({
      id: it.id,
      product: {
        id: it.product.id,
        sku: it.product.sku,
        name: it.product.name,
        uom: it.product.uom as ProductUom,
      },
      quantity: it.quantity,
    })),
    createdBy: row.createdByAdmin
      ? { id: row.createdByAdmin.id, name: row.createdByAdmin.name, email: row.createdByAdmin.email }
      : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
