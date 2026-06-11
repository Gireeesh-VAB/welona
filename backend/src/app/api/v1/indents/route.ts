import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { created } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth } from '@/lib/auth/service';
import { stockIndentCreateSchema } from '@shared/schemas/admin-indents';

/**
 * POST /api/v1/indents — branch staff raises a stock indent (purchase requisition).
 */
export const POST = route(async (req) => {
  const claims = requireAuth(req);
  const branchId = claims.branchIds[0] ?? null;
  if (!branchId) throw Errors.badRequest('Branch context is required to raise an indent.');

  const body = await parseBody(req, stockIndentCreateSchema);

  const product = await db.product.findUnique({ where: { id: body.productId, isActive: true } });
  if (!product) throw Errors.badRequest('Product not found or inactive.');

  const indent = await db.stockIndent.create({
    data: {
      orgId: claims.orgId,
      branchId,
      productId: body.productId,
      requestedQty: body.requestedQty,
      reason: body.reason ?? null,
      notes: body.notes ?? null,
      raisedBySystemUserId: null,
      status: 'pending',
    },
    select: { id: true, status: true, createdAt: true },
  });

  return created({ id: indent.id, status: indent.status, createdAt: indent.createdAt.toISOString() });
});
