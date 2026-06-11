import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { stockIndentUpdateSchema } from '@shared/schemas/admin-indents';

interface RouteContext { params: { id: string } }

/**
 * PATCH /api/v1/admin/indents/[id] — update indent status (approve/reject/fulfil).
 */
export const PATCH = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  const body = await parseBody(req, stockIndentUpdateSchema);

  const indent = await db.stockIndent.findUnique({ where: { id: params.id } });
  if (!indent) throw Errors.notFound('Indent');

  const updated = await db.stockIndent.update({
    where: { id: params.id },
    data: { status: body.status, notes: body.notes ?? indent.notes },
    include: {
      branch: { select: { id: true, name: true } },
      product: { select: { id: true, name: true, sku: true, uom: true } },
    },
  });

  return ok({
    id: updated.id,
    branchId: updated.branchId,
    branchName: updated.branch.name,
    product: updated.product,
    requestedQty: updated.requestedQty,
    status: updated.status,
    reason: updated.reason,
    notes: updated.notes,
    raisedBy: updated.raisedBySystemUserId ?? updated.raisedByAdminId ?? null,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
});
