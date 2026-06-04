import type { Prisma } from '@prisma/client';
import type {
  AdminInventoryMovement,
  AdminInventoryStockRow,
} from '@shared/types/admin-inventory';
import type { InventoryMovementType, ProductUom } from '@shared/enums';

export type StockWithProduct = Prisma.InventoryStockGetPayload<{
  include: { product: true };
}>;

export function toStockRow(row: StockWithProduct, lastMovementAt: Date | null): AdminInventoryStockRow {
  const reorder = row.product.reorderLevel;
  return {
    productId: row.productId,
    sku: row.product.sku,
    name: row.product.name,
    brand: row.product.brand,
    uom: row.product.uom as ProductUom,
    reorderLevel: reorder,
    quantity: row.quantity,
    isLowStock: reorder > 0 && row.quantity <= reorder,
    lastMovementAt: lastMovementAt ? lastMovementAt.toISOString() : null,
  };
}

export type MovementWithRelations = Prisma.InventoryMovementGetPayload<{
  include: { branch: true; product: true; createdByAdmin: true };
}>;

export function toAdminInventoryMovement(row: MovementWithRelations): AdminInventoryMovement {
  return {
    id: row.id,
    branch: { id: row.branch.id, name: row.branch.name, code: row.branch.code },
    product: {
      id: row.product.id,
      sku: row.product.sku,
      name: row.product.name,
      uom: row.product.uom as ProductUom,
    },
    type: row.type as InventoryMovementType,
    delta: row.delta,
    reason: row.reason,
    ref: row.ref,
    createdBy: row.createdByAdmin
      ? {
          id: row.createdByAdmin.id,
          name: row.createdByAdmin.name,
          email: row.createdByAdmin.email,
        }
      : null,
    createdAt: row.createdAt.toISOString(),
  };
}
