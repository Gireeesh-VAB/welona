import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { created, ok, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { rfqCreateSchema, rfqListQuerySchema } from '@shared/schemas/admin-rfq';
import { nextDocumentNumber } from '@/lib/sales/service';
import { rfqInclude, toRFQ } from '@/lib/rfq-mapper';

/**
 * Admin procurement: Request for Quotations.
 *
 * GET  /api/v1/admin/procurement/rfq?status=&search=&page=&limit=
 * POST /api/v1/admin/procurement/rfq
 */

export const GET = route(async (req) => {
  requireAdminAuth(req);
  const { status, search, page, limit } = parseQuery(req, rfqListQuerySchema);

  const anyBranch = await db.branch.findFirst({ select: { orgId: true } });
  if (!anyBranch) throw Errors.badRequest('No organization found.');
  const orgId = anyBranch.orgId;

  const where: Record<string, unknown> = { orgId };
  if (status) where.status = status;
  if (search) where.number = { contains: search };

  const [items, total] = await Promise.all([
    db.procurementRFQ.findMany({
      where,
      include: rfqInclude,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.procurementRFQ.count({ where }),
  ]);

  return ok(items.map(toRFQ), buildMeta(page, limit, total));
});

export const POST = route(async (req) => {
  const admin = requireAdminAuth(req);
  const body = await parseBody(req, rfqCreateSchema);

  const anyBranch = await db.branch.findFirst({ select: { orgId: true } });
  if (!anyBranch) throw Errors.badRequest('No organization found.');
  const orgId = anyBranch.orgId;

  const productIds = body.items.map((i) => i.productId);
  const products = await db.product.findMany({ where: { id: { in: productIds } }, select: { id: true } });
  if (products.length !== productIds.length) throw Errors.badRequest('One or more products not found.');

  const rfq = await db.$transaction(async (tx) => {
    const number = await nextDocumentNumber(tx, orgId, 'rfq', 'RFQ');
    return tx.procurementRFQ.create({
      data: {
        orgId,
        number,
        status: 'draft',
        reason: body.reason ?? null,
        notes: body.notes ?? null,
        indentId: body.indentId ?? null,
        createdByAdminId: admin.sub,
        items: { create: body.items.map((i) => ({ productId: i.productId, requiredQty: i.requiredQty })) },
      },
      include: rfqInclude,
    });
  });

  return created(toRFQ(rfq));
});

