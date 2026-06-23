export interface ServiceInventoryItem {
  id: string;
  productId: string;
  productName: string;
  productUom: string;
  quantityPerSession: number;
  /** 'collect_amount' = charged in billing; 'consume_only' = deducted from stock only */
  chargeType: string;
  lowStockThreshold: number | null;
  sortOrder: number;
}

export interface AdminService {
  id: string;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  name: string;
  hsnSacCode: string | null;
  /** Stored as integer paise; convert for display. */
  minPrice: number;
  maxPrice: number;
  /** Whole percentage, 0-100. */
  taxPercent: number;
  /** 'inclusive' | 'exclusive' */
  taxType: string;
  hasMeasurements: boolean;
  hasComplementary: boolean;
  sessions: number;
  isActive: boolean;
  inventoryItems: ServiceInventoryItem[];
  createdBy: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}
