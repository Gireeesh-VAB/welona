export interface AdminInventoryReportSummary {
  /** Distinct active products in scope. */
  products: number;
  /** Total on-hand units across the scope. */
  totalUnits: number;
  /** Stock valuation in paise: Σ quantity × purchasePrice. */
  valuation: number;
  lowStock: number;
  outOfStock: number;
  /** Units sold (out) over the window. */
  soldUnits: number;
  /** Units purchased (in) over the window. */
  purchasedUnits: number;
  /** Window length used for the sold/purchased figures. */
  windowDays: number;
}

export type MovementClass = 'fast' | 'slow' | 'dead';

export interface AdminInventoryProductReportRow {
  productId: string;
  sku: string;
  name: string;
  brand: string | null;
  quantity: number;
  reorderLevel: number;
  isLowStock: boolean;
  /** paise: quantity × purchasePrice. */
  valuation: number;
  soldUnits: number;
  purchasedUnits: number;
  movementClass: MovementClass;
}
