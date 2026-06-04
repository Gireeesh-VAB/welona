import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminOrBranchAuth } from '@/lib/auth/service';
import { resolveOrgId } from '@/lib/org';
import { nextDocumentNumber } from '@/lib/sales/service';
import {
  adminStockTransferCreateSchema,
  adminStockTransferListQuerySchema,
} from '@shared/schemas/admin-stock-transfers';
import {
  toAdminStockTransfer,
  stockTransferInclude,
  type StockTransferWithRelations,
} from '@/lib/admin-stock-transfer-mapper';
import { recordAudit, actorFromClaims } from '@/lib/audit';

/**
 * GET  /api/v1/admin/stock-transfers?branchId=&status=
 * POST /api/v1/admin/stock-transfers
 *
 * A branch session sees transfers where it is the source OR destination, and
 * may only create transfers OUT of its own branch.
 */
export const GET = route(async (req) => {
  const { branchScope } = requireAdminOrBranchAuth(req);
  const { branchId, status, page, limit } = parseQuery(req, adminStockTransferListQuerySchema);

  const scoped = branchScope ?? branchId;
  const where: Prisma.StockTransferWhereInput = {
    ...(scoped && { OR: [{ fromBranchId: scoped }, { toBranchId: scoped }] }),
    ...(status && { status }),
  };

  const [items, total] = await Promise.all([
    db.stockTransfer.findMany({
      where,
      include: stockTransferInclude,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.stockTransfer.count({ where }),
  ]);

  return ok(items.map((i) => toAdminStockTransfer(i as StockTransferWithRelations)),
    buildMeta(page, limit, total));
});

export const POST = route(async (req) => {
  const { claims, branchScope } = requireAdminOrBranchAuth(req);
  const body = await parseBody(req, adminStockTransferCreateSchema);
  const createdByAdminId = claims.type === 'admin' ? claims.sub : null;

  // Branch sessions can only send FROM their own branch.
  if (branchScope && body.fromBranchId !== branchScope) {
    throw Errors.forbidden('You can only transfer stock out of your own branch.');
  }

  const [from, to, products] = await Promise.all([
    db.branch.findUnique({ where: { id: body.fromBranchId }, select: { id: true } }),
    db.branch.findUnique({ where: { id: body.toBranchId }, select: { id: true } }),
    db.product.findMany({
      where: { id: { in: body.items.map((i) => i.productId) } },
      select: { id: true },
    }),
  ]);
  if (!from) throw Errors.badRequest('Source branch no longer exists.');
  if (!to) throw Errors.badRequest('Destination branch no longer exists.');
  const validIds = new Set(products.map((p) => p.id));
  if (body.items.some((i) => !validIds.has(i.productId))) {
    throw Errors.badRequest('One or more selected products no longer exist.');
  }

  const orgId = await resolveOrgId();
  const transfer = await db.$transaction(async (tx) => {
    const number = await nextDocumentNumber(tx, orgId, 'transfer', 'TRF');
    return tx.stockTransfer.create({
      data: {
        orgId,
        number,
        fromBranchId: body.fromBranchId,
        toBranchId: body.toBranchId,
        status: 'requested',
        notes: body.notes ?? null,
        createdByAdminId,
        items: { create: body.items.map((it) => ({ productId: it.productId, quantity: it.quantity })) },
      },
      include: stockTransferInclude,
    });
  });

  await recordAudit({
    actor: actorFromClaims(claims),
    action: 'create',
    entity: 'stock_transfer',
    entityId: transfer.id,
    branchId: body.fromBranchId,
    summary: `Created ${transfer.number}: ${transfer.fromBranch.name} → ${transfer.toBranch.name}`,
  });
  return created(toAdminStockTransfer(transfer as StockTransferWithRelations));
});
