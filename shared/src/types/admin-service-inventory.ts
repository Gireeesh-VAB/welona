export type ServiceInventoryReadiness = 'ready' | 'low' | 'blocked' | 'no_items';

export interface ServiceInventoryItemRow {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  /** Purchase/stock unit (e.g. Strip, Bottle). */
  productUom: string;
  /** Consumption unit for stock/deduction (e.g. Tablet, ml). Same as productUom when no conversion. */
  productConsumptionUom: string;
  /** Quantity per session in consumption units. */
  quantityPerSession: number;
  lowStockThreshold: number | null;
  /** Current stock in consumption units. */
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
  /** Purchase/stock unit label (e.g. Strip, Bottle). */
  uom: string;
  /** Consumption unit — what stock is stored and displayed in (e.g. ml, Tablet). */
  consumptionUom: string | null;
  /** How many consumption units per 1 purchase unit. 1 = no conversion. */
  unitsPerPurchase: number;
  mrp: number;
  salePrice: number;
  purchasePrice: number;
  taxPercent: number;
  /** Reorder threshold in consumption units. */
  reorderLevel: number;
  /** Current stock in consumption units. */
  quantity: number;
  isLowStock: boolean;
  trackBatches: boolean;
  isActive: boolean;
  lastMovementAt: string | null;
}

export interface ConsumableUnitRow {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  purchaseUom: string;
  consumptionUom: string;
  totalCapacity: number;
  usedQuantity: number;
  remaining: number;
  percentUsed: number;
  status: 'sealed' | 'open' | 'exhausted' | 'discarded';
  openedAt: string | null;
  exhaustedAt: string | null;
  createdAt: string;
  grnId: string | null;
  grnNumber: string | null;
  grnReceivedAt: string | null;
}
