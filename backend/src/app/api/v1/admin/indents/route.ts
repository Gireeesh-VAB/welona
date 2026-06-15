import { z } from 'zod';
import { db } from '@/lib/db';
import { route, parseQuery, parseBody } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { stockIndentListQuerySchema } from '@shared/schemas/admin-indents';

const adminIndentCreateSchema = z.object({
  branchId: z.string().min(1),
  productId: z.string().min(1),
  requestedQty: z.coerce.number().int().positive(),
  reason: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(500).optional(),
});

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

/**
 * POST /api/v1/admin/indents — admin raises a stock indent on behalf of a branch.
 */
export const POST = route(async (req) => {
  const admin = requireAdminAuth(req);
  const body = await parseBody(req, adminIndentCreateSchema);

  const [branch, product] = await Promise.all([
    db.branch.findUnique({ where: { id: body.branchId } }),
    db.product.findUnique({ where: { id: body.productId, isActive: true } }),
  ]);
  if (!branch) throw Errors.notFound('Branch');
  if (!product) throw Errors.badRequest('Product not found or inactive.');

  const indent = await db.stockIndent.create({
    data: {
      orgId: branch.orgId,
      branchId: body.branchId,
      productId: body.productId,
      requestedQty: body.requestedQty,
      reason: body.reason ?? null,
      notes: body.notes ?? null,
      raisedByAdminId: admin.sub,
      status: 'pending',
    },
    include: {
      branch: { select: { id: true, name: true, code: true } },
      product: { select: { id: true, name: true, sku: true, uom: true } },
    },
  });

  return created(serialize(indent));
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
