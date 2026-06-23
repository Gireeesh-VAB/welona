import type { ProductUom } from '../enums';

export interface AdminProduct {
  id: string;
  sku: string;
  name: string;
  brand: string | null;
  category: { id: string; name: string } | null;
  hsnSacCode: string | null;
  uom: ProductUom;
  barcode: string | null;
  description: string | null;
  /** All money fields are integer paise. */
  mrp: number;
  salePrice: number;
  purchasePrice: number;
  /** Basis points (1800 = 18%). */
  taxPercent: number;
  /** 'inclusive' | 'exclusive' */
  taxType: string;
  reorderLevel: number;
  imageUrl: string | null;
  trackBatches: boolean;
  trackExpiry: boolean;
  hasComplementary: boolean;
  /** Unit used for stock storage and service deduction. Null = same as uom. */
  consumptionUom: string | null;
  /** Consumption units per 1 purchase unit. 1.0 = no conversion. */
  unitsPerPurchase: number;
  availableForServices: boolean;
  availableForProducts: boolean;
  isActive: boolean;
  createdBy: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}
