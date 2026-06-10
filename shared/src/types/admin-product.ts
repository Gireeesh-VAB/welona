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
  isActive: boolean;
  createdBy: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}
