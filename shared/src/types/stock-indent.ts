export interface StockIndent {
  id: string;
  branchId: string;
  branchName: string;
  product: { id: string; name: string; sku: string; uom: string };
  requestedQty: number;
  status: string;
  reason: string | null;
  notes: string | null;
  raisedBy: string | null;
  createdAt: string;
  updatedAt: string;
}
