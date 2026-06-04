export interface StockAlertRow {
  branchId: string;
  branchName: string;
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  reorderLevel: number;
}

export interface OverduePurchaseOrder {
  id: string;
  number: string;
  supplierName: string;
  branchName: string;
  status: string;
  expectedAt: string;
  /** Whole days past the expected date. */
  daysOverdue: number;
}

export interface ExpiryAlertRow {
  productId: string;
  sku: string;
  name: string;
  batchNo: string;
  branchName: string;
  quantity: number;
  expiryDate: string;
  /** Days until expiry; negative if already expired. */
  daysToExpiry: number;
}

export interface AdminInventoryAlerts {
  lowStock: StockAlertRow[];
  outOfStock: StockAlertRow[];
  overduePurchaseOrders: OverduePurchaseOrder[];
  nearExpiry: ExpiryAlertRow[];
  expired: ExpiryAlertRow[];
  counts: {
    lowStock: number;
    outOfStock: number;
    overduePurchaseOrders: number;
    nearExpiry: number;
    expired: number;
  };
}
