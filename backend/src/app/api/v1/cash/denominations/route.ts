import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok, created } from '@/lib/api/response';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { cashDenominationCreateSchema } from '@shared/schemas/cash';

/** GET /api/v1/cash/denominations — recorded cash counts, newest first. */
export const GET = route(async (req) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'finance:read');

  const rows = await db.cashDenomination.findMany({
    where: { orgId: claims.orgId, ...(claims.branchIds[0] ? { branchId: claims.branchIds[0] } : {}) },
    orderBy: { countedAt: 'desc' },
    take: 100,
  });

  return ok(
    rows.map((r) => ({
      id: r.id,
      countedAt: r.countedAt.toISOString(),
      label: r.label,
      breakdown: JSON.parse(r.breakdown) as Record<string, number>,
      total: r.total,
      note: r.note,
      createdAt: r.createdAt.toISOString(),
    })),
  );
});

/** POST /api/v1/cash/denominations — save a denomination-wise cash count. */
export const POST = route(async (req) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'finance:create');
  const body = await parseBody(req, cashDenominationCreateSchema);

  // Total in minor units: sum(denomination in rupees × count) × 100.
  const total = Object.entries(body.breakdown).reduce(
    (sum, [denom, count]) => sum + Number(denom) * count * 100,
    0,
  );

  const row = await db.cashDenomination.create({
    data: {
      orgId: claims.orgId,
      countedAt: body.countedAt ? new Date(body.countedAt) : new Date(),
      label: body.label || null,
      breakdown: JSON.stringify(body.breakdown),
      total,
      note: body.note || null,
      createdById: claims.sub,
    },
  });
  return created({ id: row.id, total: row.total });
});
