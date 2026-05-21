import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok, created } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { dayCloseCreateSchema } from '@/lib/cash';
import type { DayClose } from '@prisma/client';

/** Serialise a DayClose row for the API. */
function serialize(c: DayClose) {
  return {
    id: c.id,
    closeDate: c.closeDate.toISOString(),
    openingCash: c.openingCash,
    cashCollections: c.cashCollections,
    pettyCashIn: c.pettyCashIn,
    pettyCashOut: c.pettyCashOut,
    expectedCash: c.expectedCash,
    countedCash: c.countedCash,
    difference: c.difference,
    note: c.note,
    closedAt: c.closedAt.toISOString(),
  };
}

/** GET /api/v1/cash/day-close — past day-close records, newest first. */
export const GET = route(async (req) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'finance:read');

  const rows = await db.dayClose.findMany({
    where: { orgId: claims.orgId },
    orderBy: { closeDate: 'desc' },
    take: 100,
  });
  return ok(rows.map(serialize));
});

/** POST /api/v1/cash/day-close — close a day after reconciling the cash. */
export const POST = route(async (req) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'finance:create');
  const body = await parseBody(req, dayCloseCreateSchema);

  const d = new Date(body.closeDate);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);

  const existing = await db.dayClose.findFirst({
    where: { orgId: claims.orgId, closeDate: { gte: start, lt: end } },
  });
  if (existing) throw Errors.conflict('This day has already been closed');

  // Figures are recomputed server-side, never trusted from the client.
  const [payments, pettyIn, pettyOut] = await Promise.all([
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
  ]);

  const cashCollections = payments._sum.amount ?? 0;
  const pettyCashIn = pettyIn._sum.amount ?? 0;
  const pettyCashOut = pettyOut._sum.amount ?? 0;
  const expectedCash = body.openingCash + cashCollections + pettyCashIn - pettyCashOut;
  const difference = body.countedCash - expectedCash;

  const close = await db.dayClose.create({
    data: {
      orgId: claims.orgId,
      closeDate: start,
      openingCash: body.openingCash,
      cashCollections,
      pettyCashIn,
      pettyCashOut,
      expectedCash,
      countedCash: body.countedCash,
      difference,
      note: body.note || null,
      closedById: claims.sub,
    },
  });
  return created(serialize(close));
});
