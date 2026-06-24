import type { StockIndentStatus } from '../enums';

export interface StockIndentItem {
  id: string;
  product: { id: string; name: string; sku: string; uom: string };
  requestedQty: number;
  approvedQty: number | null;
  rejectedQty: number | null;
  rejectionReason: string | null;
  fulfilledQty: number | null;
  receivedQty: number | null;
}

export interface StockIndent {
  id: string;
  number: string | null;
  branchId: string;
  branchName: string;
  status: StockIndentStatus;
  reason: string | null;
  notes: string | null;
  // Delivery tracking
  dispatchMethod: string | null;
  vehicleNumber: string | null;
  driverName: string | null;
  driverMobile: string | null;
  pickupEmployeeId: string | null;
  providerName: string | null;
  trackingNumber: string | null;
  deliveryCharges: number | null;
  customMethodName: string | null;
  dispatchedAt: string | null;
  expectedDeliveryAt: string | null;
  deliveryNotes: string | null;
  // Lifecycle timestamps
  approvedAt: string | null;
  receivedAt: string | null;
  closedAt: string | null;
  rejectedAt: string | null;
  // Legacy / misc
  poId: string | null;
  raisedBy: string | null;
  items: StockIndentItem[];
  createdAt: string;
  updatedAt: string;
}
