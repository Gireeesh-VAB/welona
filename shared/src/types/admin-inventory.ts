import type { InventoryMovementType, ProductUom } from '../enums';

export interface AdminInventoryStockRow {
  productId: string;
  sku: string;
  name: string;
  brand: string | null;
  uom: ProductUom;
  reorderLevel: number;
  quantity: number;
  /** True when `quantity <= reorderLevel` (and reorderLevel > 0). */
  isLowStock: boolean;
  /** Last movement time for this (branch, product), or null if no movements. */
  lastMovementAt: string | null;
}

export interface AdminInventoryMovement {
  id: string;
  branch: { id: string; name: string; code: string };
  product: { id: string; sku: string; name: string; uom: ProductUom };
  type: InventoryMovementType;
  delta: number;
  reason: string | null;
  ref: string | null;
  createdBy: { id: string; name: string; email: string } | null;
  createdAt: string;
}
