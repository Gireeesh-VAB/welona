import { db } from '@/lib/db';
import { route, parseQuery } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { dayCloseQuerySchema } from '@/lib/cash';

/**
 * GET /api/v1/cash/day-close/summary?date=YYYY-MM-DD — the computed cash
 * position for a day: cash collected, petty cash in/out, suggested opening
 * balance, and whether the day is already closed.
 */
export const GET = route(async (req) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'finance:read');
  const { date } = parseQuery(req, dayCloseQuerySchema);

  const [y, m, d] = date.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const end = new Date(y, m - 1, d + 1);

  const [payments, pettyIn, pettyOut, existing, prevClose] = await Promise.all([
    db.payment.aggregate({
      _sum: { amount: true },
      where: { orgId: claims.orgId, method: 'cash', receivedAt: { gte: start, lt: end } },
    }),
    db.pettyCashEntry.aggregate({
      _sum: { amount: true },
      where: { orgId: claims.orgId, direction: 'in', entryDate: { gte: start, lt: end } },
    }),
    db.pettyCashEntry.aggregate({
      _sum: { amount: true },
      where: { orgId: claims.orgId, direction: 'out', entryDate: { gte: start, lt: end } },
    }),
    db.dayClose.findFirst({
      where: { orgId: claims.orgId, closeDate: { gte: start, lt: end } },
    }),
    db.dayClose.findFirst({
      where: { orgId: claims.orgId, closeDate: { lt: start } },
      orderBy: { closeDate: 'desc' },
    }),
  ]);

  return ok({
    date,
    cashCollections: payments._sum.amount ?? 0,
    pettyCashIn: pettyIn._sum.amount ?? 0,
    pettyCashOut: pettyOut._sum.amount ?? 0,
    suggestedOpening: prevClose?.countedCash ?? 0,
    alreadyClosed: !!existing,
    close: existing
      ? {
          id: existing.id,
          closeDate: existing.closeDate.toISOString(),
          openingCash: existing.openingCash,
          cashCollections: existing.cashCollections,
          pettyCashIn: existing.pettyCashIn,
          pettyCashOut: existing.pettyCashOut,
          expectedCash: existing.expectedCash,
          countedCash: existing.countedCash,
          difference: existing.difference,
          note: existing.note,
          closedAt: existing.closedAt.toISOString(),
        }
      : null,
  });
});
