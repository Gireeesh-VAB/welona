export type ServiceInventoryReadiness = 'ready' | 'low' | 'blocked' | 'no_items';

export interface ServiceInventoryItemRow {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  productUom: string;
  quantityPerSession: number;
  lowStockThreshold: number | null;
  currentStock: number;
  /** 'ok' | 'low' | 'out' */
  stockStatus: string;
}

export interface AdminServiceInventoryRow {
  id: string;
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  isActive: boolean;
  readiness: ServiceInventoryReadiness;
  inventoryItems: ServiceInventoryItemRow[];
}

export interface AdminProductInventoryRow {
  productId: string;
  sku: string;
  name: string;
  brand: string | null;
  categoryId: string | null;
  categoryName: string | null;
  uom: string;
  mrp: number;
  salePrice: number;
  purchasePrice: number;
  taxPercent: number;
  reorderLevel: number;
  quantity: number;
  isLowStock: boolean;
  trackBatches: boolean;
  isActive: boolean;
  lastMovementAt: string | null;
}
