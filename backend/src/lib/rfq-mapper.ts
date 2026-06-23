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
  indent: { select: { number: true, branchId: true } },
} as const;

function computeScores(quotes: any[], rfqItems: any[]): any[] {
  if (quotes.length === 0) return [];

  // Compute estimated total cost per quote
  const totals = quotes.map((q) => {
    let total = 0;
    for (const rfqItem of rfqItems) {
      const qi = q.items.find((x: any) => x.productId === rfqItem.productId);
      if (qi) total += qi.unitPrice * rfqItem.requiredQty;
    }
    return total;
  });

  // Compute average delivery days per quote
  const avgDelivery = quotes.map((q) => {
    if (q.items.length === 0) return 999;
    return q.items.reduce((s: number, x: any) => s + x.deliveryDays, 0) / q.items.length;
  });

  const minTotal = Math.min(...totals.filter((t) => t > 0));
  const maxTotal = Math.max(...totals.filter((t) => t > 0));
  const minDel = Math.min(...avgDelivery);
  const maxDel = Math.max(...avgDelivery);

  const scored = quotes.map((q, i) => {
    const total = totals[i];
    const del = avgDelivery[i];

    const priceScore =
      maxTotal === minTotal || total === 0
        ? 100
        : Math.round(((maxTotal - total) / (maxTotal - minTotal)) * 100);

    const deliveryScore =
      maxDel === minDel
        ? 100
        : Math.round(((maxDel - del) / (maxDel - minDel)) * 100);

    const score = Math.round(priceScore * 0.4 + deliveryScore * 0.35 + 25);
    return { quote: q, score };
  });

  const maxScore = Math.max(...scored.map((s) => s.score));
  const topIdx = scored.findIndex((s) => s.score === maxScore);

  return scored.map((s, i) => ({
    ...s.quote,
    _score: s.score,
    _isRecommended: i === topIdx && s.score >= 50,
    _reason:
      i === topIdx && s.score >= 50
        ? `Best overall: price score ${Math.round(scored[i].score * 0.4 / 0.4)}%, delivery score ${Math.round((s.score - 25 - scored[i].score * 0.4) / 0.35)}%.`
        : null,
  }));
}

export function serializeQuote(q: any, _score?: number, _isRecommended?: boolean, _reason?: string | null): any {
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
    score: _score ?? null,
    isRecommended: _isRecommended ?? false,
    recommendationReason: _reason ?? null,
  };
}

export function toRFQ(row: any): any {
  const submittedQuotes = row.supplierQuotes.filter((q: any) => q.status === 'submitted');
  const scored = computeScores(submittedQuotes, row.items);
  const scoredMap = new Map(scored.map((s: any) => [s.id, s]));

  return {
    id: row.id,
    number: row.number ?? null,
    orgId: row.orgId,
    status: row.status,
    reason: row.reason ?? null,
    notes: row.notes ?? null,
    indentId: row.indentId ?? null,
    indentNumber: row.indent?.number ?? null,
    indentBranchId: row.indent?.branchId ?? null,
    items: row.items.map((i: any) => ({
      id: i.id,
      productId: i.productId,
      productName: i.product.name,
      productSku: i.product.sku,
      productUom: i.product.uom,
      requiredQty: i.requiredQty,
    })),
    supplierQuotes: row.supplierQuotes.map((q: any) => {
      const s = scoredMap.get(q.id) as any;
      return serializeQuote(q, s?._score ?? null, s?._isRecommended ?? false, s?._reason ?? null);
    }),
    createdBy: row.createdByAdmin?.name ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
