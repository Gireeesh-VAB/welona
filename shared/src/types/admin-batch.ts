export interface AdminBatchRow {
  id: string;
  productId: string;
  sku: string;
  name: string;
  batchNo: string;
  mfgDate: string | null;
  expiryDate: string | null;
  /** Total on-hand across warehouses (optionally scoped to a branch). */
  quantity: number;
  daysToExpiry: number | null;
}
