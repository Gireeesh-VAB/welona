import { z } from 'zod';
import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { created, ok, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth } from '@/lib/auth/service';
import { nextDocumentNumber } from '@/lib/sales/service';
import { stockIndentListQuerySchema } from '@shared/schemas/admin-indents';
import { stockIndentInclude, toStockIndent, type StockIndentWithRelations } from '@/lib/admin-indent-mapper';

// Branch-side create schema (no branchId — inferred from auth claims)
const branchIndentCreateSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1, 'Product is required'),
        requestedQty: z.coerce.number().int().positive('Must be at least 1'),
      }),
    )
    .min(1, 'Add at least one product'),
  reason: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(500).optional(),
});

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
 * POST /api/v1/indents — branch staff raises a stock indent (purchase requisition).
 */
export const POST = route(async (req) => {
  const claims = requireAuth(req);
  const branchId = claims.branchIds[0] ?? null;
  if (!branchId) throw Errors.badRequest('Branch context is required to raise an indent.');

  const body = await parseBody(req, branchIndentCreateSchema);

  const productIds = body.items.map((i) => i.productId);
  const products = await db.product.findMany({
    where: { id: { in: productIds }, isActive: true },
    select: { id: true },
  });
  const validIds = new Set(products.map((p) => p.id));
  if (body.items.some((i) => !validIds.has(i.productId))) {
    throw Errors.badRequest('One or more products not found or inactive.');
  }

  const branch = await db.branch.findUnique({ where: { id: branchId }, select: { orgId: true } });
  if (!branch) throw Errors.notFound('Branch');

  const indent = await db.$transaction(async (tx) => {
    const number = await nextDocumentNumber(tx, branch.orgId, 'indent', 'IND');
    return tx.stockIndent.create({
      data: {
        orgId: branch.orgId,
        number,
        branchId,
        status: 'pending',
        reason: body.reason ?? null,
        notes: body.notes ?? null,
        raisedBySystemUserId: null,
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
