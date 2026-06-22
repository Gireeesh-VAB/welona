/**
 * Shared serialiser + Prisma include for ProcurementRFQ.
 * Kept outside route files so they aren't treated as HTTP exports by Next.js.
 */

export const rfqInclude = {
  items: { include: { product: { select: { id: true, name: true, sku: true, uom: true } } } },
  supplierQuotes: {
    include: {
      supplier: { select: { id: true, name: true, code: true } },
      items: { include: { product: { select: { id: true, name: true, sku: true, uom: true } } } },
    },
  },
  createdByAdmin: { select: { name: true } },
  indent: { select: { number: true } },
} as const;

export function serializeQuote(q: any): any {
  return {
    id: q.id,
    supplierId: q.supplierId,
    supplierName: q.supplier.name,
    supplierCode: q.supplier.code,
    status: q.status,
    submittedAt: q.submittedAt?.toISOString() ?? null,
    validUntil: q.validUntil?.toISOString() ?? null,
    notes: q.notes ?? null,
    items: q.items.map((qi: any) => ({
      id: qi.id,
      productId: qi.productId,
      productName: qi.product.name,
      productSku: qi.product.sku,
      productUom: qi.product.uom,
      unitPrice: qi.unitPrice,
      deliveryDays: qi.deliveryDays,
      moq: qi.moq ?? null,
      notes: qi.notes ?? null,
    })),
    score: null,
    isRecommended: false,
    recommendationReason: null,
  };
}

export function toRFQ(row: any): any {
  return {
    id: row.id,
    number: row.number ?? null,
    orgId: row.orgId,
    status: row.status,
    reason: row.reason ?? null,
    notes: row.notes ?? null,
    indentId: row.indentId ?? null,
    indentNumber: row.indent?.number ?? null,
    items: row.items.map((i: any) => ({
      id: i.id,
      productId: i.productId,
      productName: i.product.name,
      productSku: i.product.sku,
      productUom: i.product.uom,
      requiredQty: i.requiredQty,
    })),
    supplierQuotes: row.supplierQuotes.map((q: any) => serializeQuote(q)),
    createdBy: row.createdByAdmin?.name ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
