import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { rfqUpdateSchema } from '@shared/schemas/admin-rfq';
import { rfqInclude, toRFQ, serializeQuote } from '@/lib/rfq-mapper';

interface RouteContext {
  params: { id: string };
}

export const GET = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);

  const rfq = await db.procurementRFQ.findUnique({
    where: { id: params.id },
    include: rfqInclude,
  });
  if (!rfq) throw Errors.notFound('RFQ');

  const submittedQuotes = rfq.supplierQuotes.filter((q: any) => q.status === 'submitted');

  const supplierIds = submittedQuotes.map((q: any) => q.supplierId);
  const poHistory = await db.purchaseOrder.groupBy({
    by: ['supplierId', 'status'],
    where: { supplierId: { in: supplierIds } },
    _count: { id: true },
  });

  const poStats = new Map<string, { total: number; received: number }>();
  for (const row of poHistory) {
    const existing = poStats.get(row.supplierId) ?? { total: 0, received: 0 };
    existing.total += row._count.id;
    if (row.status === 'received') existing.received += row._count.id;
    poStats.set(row.supplierId, existing);
  }

  const minPriceByProduct = new Map<string, number>();
  const minDeliveryByProduct = new Map<string, number>();
  for (const quote of submittedQuotes) {
    for (const qi of (quote as any).items) {
      const cur = minPriceByProduct.get(qi.productId);
      if (cur === undefined || qi.unitPrice < cur) minPriceByProduct.set(qi.productId, qi.unitPrice);
      const curD = minDeliveryByProduct.get(qi.productId);
      if (curD === undefined || qi.deliveryDays < curD) minDeliveryByProduct.set(qi.productId, qi.deliveryDays);
    }
  }

  const scores = new Map<string, number>();
  for (const quote of submittedQuotes) {
    const items = (quote as any).items as any[];

    let priceScore = 100;
    if (items.length > 0) {
      const ratios = items.map((qi) => {
        const min = minPriceByProduct.get(qi.productId) ?? qi.unitPrice;
        return min > 0 ? (min / qi.unitPrice) * 100 : 100;
      });
      priceScore = ratios.reduce((a: number, b: number) => a + b, 0) / ratios.length;
    }

    let deliveryScore = 100;
    if (items.length > 0) {
      const ratios = items.map((qi) => {
        const min = minDeliveryByProduct.get(qi.productId) ?? qi.deliveryDays;
        return qi.deliveryDays > 0 ? (min / qi.deliveryDays) * 100 : 100;
      });
      deliveryScore = ratios.reduce((a: number, b: number) => a + b, 0) / ratios.length;
    }

    const stats = poStats.get(quote.supplierId);
    const perfScore = stats && stats.total > 0 ? (stats.received / stats.total) * 100 : 70;

    const total = priceScore * 0.4 + deliveryScore * 0.35 + perfScore * 0.25;
    scores.set(quote.id, Math.round(total * 10) / 10);
  }

  let recommendedId: string | null = null;
  let highestScore = -1;
  for (const [quoteId, score] of scores) {
    if (score > highestScore) {
      highestScore = score;
      recommendedId = quoteId;
    }
  }

  const serialized = toRFQ(rfq);
  serialized.supplierQuotes = rfq.supplierQuotes.map((q: any) => {
    const base = serializeQuote(q);
    if (q.status === 'submitted') {
      const score = scores.get(q.id) ?? null;
      base.score = score;
      base.isRecommended = q.id === recommendedId;
      base.recommendationReason =
        q.id === recommendedId
          ? `Highest overall score (${score}) based on price, delivery speed, and PO history.`
          : null;
    }
    return base;
  });

  return ok(serialized);
});

export const PATCH = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  const body = await parseBody(req, rfqUpdateSchema);

  const existing = await db.procurementRFQ.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!existing) throw Errors.notFound('RFQ');

  const rfq = await db.procurementRFQ.update({
    where: { id: params.id },
    data: {
      ...(body.status !== undefined && { status: body.status }),
      ...(body.notes !== undefined && { notes: body.notes ?? null }),
    },
    include: rfqInclude,
  });

  return ok(toRFQ(rfq));
});
