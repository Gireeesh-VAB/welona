import { Prisma } from '@prisma/client';
import type { StockIndent } from '@shared/types/stock-indent';
import type { StockIndentStatus } from '@shared/enums';

export const stockIndentInclude = {
  branch: { select: { id: true, name: true, code: true } },
  items: { include: { product: { select: { id: true, name: true, sku: true, uom: true } } } },
} satisfies Prisma.StockIndentInclude;

export type StockIndentWithRelations = Prisma.StockIndentGetPayload<{
  include: {
    branch: { select: { id: true; name: true; code: true } };
    items: { include: { product: { select: { id: true; name: true; sku: true; uom: true } } } };
  };
}>;

export function toStockIndent(row: StockIndentWithRelations): StockIndent {
  return {
    id: row.id,
    number: row.number ?? null,
    branchId: row.branchId,
    branchName: row.branch.name,
    status: row.status as StockIndentStatus,
    reason: row.reason ?? null,
    notes: row.notes ?? null,
    vehicleNumber: row.vehicleNumber ?? null,
    driverName: row.driverName ?? null,
    driverMobile: row.driverMobile ?? null,
    dispatchedAt: row.dispatchedAt?.toISOString() ?? null,
    expectedDeliveryAt: row.expectedDeliveryAt?.toISOString() ?? null,
    deliveryNotes: row.deliveryNotes ?? null,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    receivedAt: row.receivedAt?.toISOString() ?? null,
    closedAt: row.closedAt?.toISOString() ?? null,
    rejectedAt: row.rejectedAt?.toISOString() ?? null,
    poId: row.poId ?? null,
    raisedBy: row.raisedBySystemUserId ?? row.raisedByAdminId ?? null,
    items: row.items.map((it) => ({
      id: it.id,
      product: { id: it.product.id, name: it.product.name, sku: it.product.sku, uom: it.product.uom },
      requestedQty: it.requestedQty,
      approvedQty: it.approvedQty ?? null,
      rejectedQty: it.rejectedQty ?? null,
      rejectionReason: it.rejectionReason ?? null,
      fulfilledQty: it.fulfilledQty ?? null,
      receivedQty: it.receivedQty ?? null,
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
