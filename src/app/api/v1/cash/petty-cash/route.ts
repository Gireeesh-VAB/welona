import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok, created } from '@/lib/api/response';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { pettyCashCreateSchema } from '@/lib/cash';

/** GET /api/v1/cash/petty-cash — petty-cash ledger with running totals. */
export const GET = route(async (req) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'finance:read');

  const rows = await db.pettyCashEntry.findMany({
    where: { orgId: claims.orgId },
    orderBy: { entryDate: 'desc' },
    take: 300,
  });

  const totalIn = rows
    .filter((r) => r.direction === 'in')
    .reduce((s, r) => s + r.amount, 0);
  const totalOut = rows
    .filter((r) => r.direction === 'out')
    .reduce((s, r) => s + r.amount, 0);

  return ok({
    entries: rows.map((r) => ({
      id: r.id,
      entryDate: r.entryDate.toISOString(),
      direction: r.direction,
      category: r.category,
      description: r.description,
      amount: r.amount,
      paidTo: r.paidTo,
      reference: r.reference,
      createdAt: r.createdAt.toISOString(),
    })),
    summary: { totalIn, totalOut, balance: totalIn - totalOut },
  });
});

/** POST /api/v1/cash/petty-cash — record a petty-cash entry. */
export const POST = route(async (req) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'finance:create');
  const body = await parseBody(req, pettyCashCreateSchema);

  const entry = await db.pettyCashEntry.create({
    data: {
      orgId: claims.orgId,
      entryDate: body.entryDate ? new Date(body.entryDate) : new Date(),
      direction: body.direction,
      category: body.category || null,
      description: body.description,
      amount: body.amount,
      paidTo: body.paidTo || null,
      reference: body.reference || null,
      createdById: claims.sub,
    },
  });
  return created(entry);
});
