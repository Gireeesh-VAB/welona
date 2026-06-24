import type { ProductUom, PurchaseOrderStatus } from '../enums';

export interface AdminPurchaseOrderItem {
  id: string;
  product: { id: string; sku: string; name: string; uom: ProductUom; trackBatches: boolean };
  quantity: number;
  quantityReceived: number;
  /** paise */
  unitPrice: number;
  /** basis points (1800 = 18%) */
  taxRate: number;
  /** paise, pre-tax (unitPrice × quantity) */
  lineTotal: number;
}

export interface AdminPurchaseOrder {
  id: string;
  number: string;
  status: PurchaseOrderStatus;
  branch: { id: string; name: string; code: string };
  supplier: { id: string; name: string; code: string };
  orderedAt: string;
  expectedAt: string | null;
  /** All money fields integer paise. */
  subtotal: number;
  taxAmt: number;
  total: number;
  notes: string | null;
  paymentStatus: string | null;
  paymentDate: string | null;
  paymentMethod: string | null;
  amountPaid: number | null;
  paymentReference: string | null;
  items: AdminPurchaseOrderItem[];
  createdBy: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminGoodsReceiptItem {
  id: string;
  product: { id: string; sku: string; name: string; uom: ProductUom };
  quantity: number;
  damagedQty: number;
}

export interface AdminGoodsReceipt {
  id: string;
  number: string;
  branch: { id: string; name: string; code: string };
  supplier: { id: string; name: string; code: string } | null;
  poId: string | null;
  poNumber: string | null;
  receivedAt: string;
  notes: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  invoiceAmount: number | null;
  poPaymentStatus: string | null;
  items: AdminGoodsReceiptItem[];
  createdBy: { id: string; name: string; email: string } | null;
  createdAt: string;
}
