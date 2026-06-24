import { Prisma } from '@prisma/client';
import type {
  AdminGoodsReceipt,
  AdminPurchaseOrder,
} from '@shared/types/admin-purchase-order';
import type { ProductUom, PurchaseOrderStatus } from '@shared/enums';

/** Relations every PO endpoint loads. (Kept here, not in route.ts, because a
 * Next route module may only export request handlers.) */
export const purchaseOrderInclude = {
  branch: true,
  supplier: true,
  createdByAdmin: true,
  items: { include: { product: true } },
} satisfies Prisma.PurchaseOrderInclude;

export type PurchaseOrderWithRelations = Prisma.PurchaseOrderGetPayload<{
  include: {
    branch: true;
    supplier: true;
    createdByAdmin: true;
    items: { include: { product: true } };
  };
}>;

export type GoodsReceiptWithRelations = Prisma.GoodsReceiptGetPayload<{
  include: {
    branch: true;
    supplier: true;
    po: true;
    createdByAdmin: true;
    items: { include: { product: true } };
  };
}>;

function creator(admin: { id: string; name: string; email: string } | null) {
  return admin ? { id: admin.id, name: admin.name, email: admin.email } : null;
}

export function toAdminPurchaseOrder(row: PurchaseOrderWithRelations): AdminPurchaseOrder {
  return {
    id: row.id,
    number: row.number,
    status: row.status as PurchaseOrderStatus,
    branch: { id: row.branch.id, name: row.branch.name, code: row.branch.code },
    supplier: { id: row.supplier.id, name: row.supplier.name, code: row.supplier.code },
    orderedAt: row.orderedAt.toISOString(),
    expectedAt: row.expectedAt ? row.expectedAt.toISOString() : null,
    subtotal: row.subtotal,
    taxAmt: row.taxAmt,
    total: row.total,
    notes: row.notes,
    paymentStatus: row.paymentStatus ?? null,
    paymentDate: row.paymentDate ? row.paymentDate.toISOString() : null,
    paymentMethod: row.paymentMethod ?? null,
    amountPaid: row.amountPaid ?? null,
    paymentReference: row.paymentReference ?? null,
    items: [...row.items]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((it) => ({
        id: it.id,
        product: {
          id: it.product.id,
          sku: it.product.sku,
          name: it.product.name,
          uom: it.product.uom as ProductUom,
          trackBatches: it.product.trackBatches,
        },
        quantity: it.quantity,
        quantityReceived: it.quantityReceived,
        unitPrice: it.unitPrice,
        taxRate: it.taxRate,
        lineTotal: it.lineTotal,
      })),
    createdBy: creator(row.createdByAdmin),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toAdminGoodsReceipt(row: GoodsReceiptWithRelations): AdminGoodsReceipt {
  return {
    id: row.id,
    number: row.number,
    branch: { id: row.branch.id, name: row.branch.name, code: row.branch.code },
    supplier: row.supplier
      ? { id: row.supplier.id, name: row.supplier.name, code: row.supplier.code }
      : null,
    poId: row.poId,
    poNumber: row.po?.number ?? null,
    receivedAt: row.receivedAt.toISOString(),
    notes: row.notes,
    invoiceNumber: row.invoiceNumber ?? null,
    invoiceDate: row.invoiceDate ? row.invoiceDate.toISOString() : null,
    invoiceAmount: row.invoiceAmount ?? null,
    poPaymentStatus: row.po?.paymentStatus ?? null,
    items: row.items.map((it) => ({
      id: it.id,
      product: {
        id: it.product.id,
        sku: it.product.sku,
        name: it.product.name,
        uom: it.product.uom as ProductUom,
      },
      quantity: it.quantity,
      damagedQty: (it as any).damagedQty ?? 0,
    })),
    createdBy: creator(row.createdByAdmin),
    createdAt: row.createdAt.toISOString(),
  };
}
