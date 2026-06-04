import type { ProductUom, StockTransferStatus } from '../enums';

export interface AdminStockTransferItem {
  id: string;
  product: { id: string; sku: string; name: string; uom: ProductUom };
  quantity: number;
}

export interface AdminStockTransfer {
  id: string;
  number: string;
  status: StockTransferStatus;
  fromBranch: { id: string; name: string; code: string };
  toBranch: { id: string; name: string; code: string };
  dispatchedAt: string | null;
  receivedAt: string | null;
  notes: string | null;
  items: AdminStockTransferItem[];
  createdBy: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}
