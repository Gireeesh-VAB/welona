import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { resolveOrgId } from '@/lib/org';
import { nextDocumentNumber } from '@/lib/sales/service';
import {
  adminPurchaseOrderCreateSchema,
  adminPurchaseOrderListQuerySchema,
} from '@shared/schemas/admin-purchase-orders';
import {
  toAdminPurchaseOrder,
  purchaseOrderInclude,
  type PurchaseOrderWithRelations,
} from '@/lib/admin-purchase-order-mapper';
import { recordAudit, actorFromClaims } from '@/lib/audit';

/**
 * GET  /api/v1/admin/purchase-orders?search=&branchId=&supplierId=&status=
 * POST /api/v1/admin/purchase-orders
 *
 */
export const GET = route(async (req) => {
  const claims = requireAdminAuth(req);
  const { search, branchId, supplierId, status, page, limit } = parseQuery(
    req,
    adminPurchaseOrderListQuerySchema,
  );

  const where: Prisma.PurchaseOrderWhereInput = {
    ...((branchId) && { branchId: branchId }),
    ...(supplierId && { supplierId }),
    ...(status && { status }),
    ...(search && {
      OR: [
        { number: { contains: search } },
        { supplier: { name: { contains: search } } },
        { notes: { contains: search } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    db.purchaseOrder.findMany({
      where,
      include: purchaseOrderInclude,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.purchaseOrder.count({ where }),
  ]);

  return ok(items.map((i) => toAdminPurchaseOrder(i as PurchaseOrderWithRelations)),
    buildMeta(page, limit, total));
});

export const POST = route(async (req) => {
  const claims = requireAdminAuth(req);
  const body = await parseBody(req, adminPurchaseOrderCreateSchema);
  const branchId = body.branchId;
  const createdByAdminId = claims.type === 'admin' ? claims.sub : null;

  const [branch, supplier, products] = await Promise.all([
    db.branch.findUnique({ where: { id: branchId }, select: { id: true } }),
    db.supplier.findUnique({ where: { id: body.supplierId }, select: { id: true } }),
    db.product.findMany({
      where: { id: { in: body.items.map((i) => i.productId) } },
      select: { id: true },
    }),
  ]);
  if (!branch) throw Errors.notFound('Branch');
  if (!supplier) throw Errors.badRequest('Selected supplier no longer exists.');
  const validIds = new Set(products.map((p) => p.id));
  if (body.items.some((i) => !validIds.has(i.productId))) {
    throw Errors.badRequest('One or more selected products no longer exist.');
  }

  // Validate linked indents if provided
  if (body.fromIndentIds?.length) {
    const indents = await db.stockIndent.findMany({
      where: { id: { in: body.fromIndentIds } },
      select: { id: true, status: true, branchId: true },
    });
    if (indents.length !== body.fromIndentIds.length)
      throw Errors.badRequest('One or more indents not found.');
    if (indents.some((i) => i.status !== 'approved'))
      throw Errors.badRequest('All linked indents must be in approved status.');
    if (indents.some((i) => i.branchId !== branchId))
      throw Errors.badRequest('All linked indents must belong to the selected branch.');
  }

  // Totals: subtotal = Σ unit×qty; tax = Σ line×rate/10000; total = subtotal+tax.
  let subtotal = 0;
  let taxAmt = 0;
  const items = body.items.map((it, idx) => {
    const lineTotal = it.unitPrice * it.quantity;
    subtotal += lineTotal;
    taxAmt += Math.round((lineTotal * it.taxRate) / 10000);
    return {
      productId: it.productId,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      taxRate: it.taxRate,
      lineTotal,
      sortOrder: idx,
    };
  });

  const orgId = await resolveOrgId();
  const po = await db.$transaction(async (tx) => {
    const number = await nextDocumentNumber(tx, orgId, 'po', 'PO');
    const createdPo = await tx.purchaseOrder.create({
      data: {
        orgId,
        branchId,
        supplierId: body.supplierId,
        number,
        status: 'draft',
        expectedAt: body.expectedAt ? new Date(body.expectedAt) : null,
        subtotal,
        taxAmt,
        total: subtotal + taxAmt,
        notes: body.notes ?? null,
        createdByAdminId,
        items: { create: items },
      },
      include: purchaseOrderInclude,
    });

    // Link indents to this PO and mark them as ordered
    if (body.fromIndentIds?.length) {
      await tx.stockIndent.updateMany({
        where: { id: { in: body.fromIndentIds } },
        data: { status: 'ordered', poId: createdPo.id },
      });
    }

    return createdPo;
  });

  await recordAudit({
    actor: actorFromClaims(claims),
    action: 'create',
    entity: 'purchase_order',
    entityId: po.id,
    branchId,
    summary: `Created ${po.number} (${po.items.length} lines, total ${po.total} paise)`,
  });
  return created(toAdminPurchaseOrder(po as PurchaseOrderWithRelations));
});
