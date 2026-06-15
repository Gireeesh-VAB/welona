import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { created, ok, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth } from '@/lib/auth/service';
import { stockIndentCreateSchema, stockIndentListQuerySchema } from '@shared/schemas/admin-indents';

/**
 * GET /api/v1/indents — branch staff lists their own stock indent requests.
 */
export const GET = route(async (req) => {
  const claims = requireAuth(req);
  const branchId = claims.branchIds[0] ?? null;
  if (!branchId) throw Errors.badRequest('Branch context is required.');

  const { status, page, limit } = parseQuery(req, stockIndentListQuerySchema);

  const where = {
    branchId,
    ...(status && { status }),
  };

  const [items, total] = await Promise.all([
    db.stockIndent.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, sku: true, uom: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.stockIndent.count({ where }),
  ]);

  return ok(
    items.map((r) => ({
      id: r.id,
      product: r.product,
      requestedQty: r.requestedQty,
      status: r.status,
      reason: r.reason,
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
    buildMeta(page, limit, total),
  );
});

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
