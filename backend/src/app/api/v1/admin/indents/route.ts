import { db } from '@/lib/db';
import { route, parseQuery } from '@/lib/api/handler';
import { ok, buildMeta } from '@/lib/api/response';
import { requireAdminAuth } from '@/lib/auth/service';
import { stockIndentListQuerySchema } from '@shared/schemas/admin-indents';

/**
 * GET /api/v1/admin/indents — list stock indents with optional filters.
 */
export const GET = route(async (req) => {
  requireAdminAuth(req);
  const { branchId, productId, status, page, limit } = parseQuery(req, stockIndentListQuerySchema);

  const where = {
    ...(branchId && { branchId }),
    ...(productId && { productId }),
    ...(status && { status }),
  };

  const [items, total] = await Promise.all([
    db.stockIndent.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true, code: true } },
        product: { select: { id: true, name: true, sku: true, uom: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.stockIndent.count({ where }),
  ]);

  return ok(items.map(serialize), buildMeta(page, limit, total));
});

function serialize(row: {
  id: string; branchId: string; branch: { name: string };
  product: { id: string; name: string; sku: string; uom: string };
  requestedQty: number; status: string; reason: string | null;
  notes: string | null; raisedBySystemUserId: string | null;
  raisedByAdminId: string | null; createdAt: Date; updatedAt: Date;
}) {
  return {
    id: row.id,
    branchId: row.branchId,
    branchName: row.branch.name,
    product: row.product,
    requestedQty: row.requestedQty,
    status: row.status,
    reason: row.reason,
    notes: row.notes,
    raisedBy: row.raisedBySystemUserId ?? row.raisedByAdminId ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
