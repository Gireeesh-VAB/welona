import { db } from '@/lib/db';
import { route, parseQuery, parseBody } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { nextDocumentNumber } from '@/lib/sales/service';
import { stockIndentCreateSchema, stockIndentListQuerySchema } from '@shared/schemas/admin-indents';
import { stockIndentInclude, toStockIndent, type StockIndentWithRelations } from '@/lib/admin-indent-mapper';

/**
 * GET /api/v1/admin/indents — paginated list of stock indents with item details.
 */
export const GET = route(async (req) => {
  requireAdminAuth(req);
  const { branchId, status, page, limit } = parseQuery(req, stockIndentListQuerySchema);

  const where = {
    ...(branchId && { branchId }),
    ...(status && { status }),
  };

  const [items, total] = await Promise.all([
    db.stockIndent.findMany({
      where,
      include: stockIndentInclude,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.stockIndent.count({ where }),
  ]);

  return ok(
    items.map((i) => toStockIndent(i as StockIndentWithRelations)),
    buildMeta(page, limit, total),
  );
});

/**
 * POST /api/v1/admin/indents — admin raises a multi-item stock indent for a branch.
 */
export const POST = route(async (req) => {
  const admin = requireAdminAuth(req);
  const body = await parseBody(req, stockIndentCreateSchema);

  const branch = await db.branch.findUnique({ where: { id: body.branchId } });
  if (!branch) throw Errors.notFound('Branch');

  const productIds = body.items.map((i) => i.productId);
  const products = await db.product.findMany({
    where: { id: { in: productIds }, isActive: true },
    select: { id: true },
  });
  const validIds = new Set(products.map((p) => p.id));
  if (body.items.some((i) => !validIds.has(i.productId))) {
    throw Errors.badRequest('One or more products not found or inactive.');
  }

  const indent = await db.$transaction(async (tx) => {
    const number = await nextDocumentNumber(tx, branch.orgId, 'indent', 'IND');
    return tx.stockIndent.create({
      data: {
        orgId: branch.orgId,
        number,
        branchId: body.branchId,
        status: 'pending',
        reason: body.reason ?? null,
        notes: body.notes ?? null,
        raisedByAdminId: admin.sub,
        items: {
          create: body.items.map((it) => ({
            productId: it.productId,
            requestedQty: it.requestedQty,
          })),
        },
      },
      include: stockIndentInclude,
    });
  });

  return created(toStockIndent(indent as StockIndentWithRelations));
});
