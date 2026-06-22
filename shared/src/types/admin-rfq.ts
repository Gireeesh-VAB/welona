import type { RFQStatus, SupplierQuoteStatus } from '../enums';

export interface RFQItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  productUom: string;
  requiredQty: number;
}

export interface SupplierQuoteItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  productUom: string;
  unitPrice: number;
  deliveryDays: number;
  moq: number | null;
  notes: string | null;
}

export interface SupplierQuote {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierCode: string;
  status: SupplierQuoteStatus;
  submittedAt: string | null;
  validUntil: string | null;
  notes: string | null;
  items: SupplierQuoteItem[];
  score: number | null;
  isRecommended: boolean;
  recommendationReason: string | null;
}

export interface ProcurementRFQ {
  id: string;
  number: string | null;
  orgId: string;
  status: RFQStatus;
  reason: string | null;
  notes: string | null;
  indentId: string | null;
  indentNumber: string | null;
  items: RFQItem[];
  supplierQuotes: SupplierQuote[];
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WarehouseAvailabilityItem {
  productId: string;
  productName: string;
  productSku: string;
  productUom: string;
  requiredQty: number;
  warehouses: {
    warehouseId: string;
    warehouseName: string;
    branchName: string;
    available: number;
    canFulfill: boolean;
  }[];
  recommendation: {
    warehouseId: string;
    warehouseName: string;
    reason: string;
  } | null;
}

export interface WarehouseAvailability {
  indentId: string;
  items: WarehouseAvailabilityItem[];
  canFulfillAll: boolean;
  shortfallProducts: string[];
}
