import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminOrBranchAuth } from '@/lib/auth/service';
import { resolveOrgId } from '@/lib/org';
import { getDefaultWarehouseId } from '@/lib/warehouse';
import { receiveBatchStock } from '@/lib/batch';
import { nextDocumentNumber } from '@/lib/sales/service';
import {
  adminGoodsReceiptCreateSchema,
  adminGoodsReceiptListQuerySchema,
} from '@shared/schemas/admin-purchase-orders';
import {
  toAdminGoodsReceipt,
  type GoodsReceiptWithRelations,
} from '@/lib/admin-purchase-order-mapper';
import { recordAudit, actorFromClaims } from '@/lib/audit';

const goodsReceiptInclude = {
  branch: true,
  supplier: true,
  po: true,
  createdByAdmin: true,
  items: { include: { product: true } },
} satisfies Prisma.GoodsReceiptInclude;

/**
 * GET  /api/v1/admin/goods-receipts?branchId=&poId=
 * POST /api/v1/admin/goods-receipts
 *
 * Receiving goods: creates a GRN, raises branch stock via `purchase`
 * InventoryMovements (one per line, in a single transaction), and — when the
 * GRN is against a PO — bumps each line's `quantityReceived` and recomputes the
 * PO status (partially_received / received). Branch sessions are scoped.
 */
export const GET = route(async (req) => {
  const { branchScope } = requireAdminOrBranchAuth(req);
  const { branchId, poId, page, limit } = parseQuery(req, adminGoodsReceiptListQuerySchema);

  const where: Prisma.GoodsReceiptWhereInput = {
    ...((branchScope ?? branchId) && { branchId: branchScope ?? branchId }),
    ...(poId && { poId }),
  };

  const [items, total] = await Promise.all([
    db.goodsReceipt.findMany({
      where,
      include: goodsReceiptInclude,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.goodsReceipt.count({ where }),
  ]);

  return ok(items.map((i) => toAdminGoodsReceipt(i as GoodsReceiptWithRelations)),
    buildMeta(page, limit, total));
});

export const POST = route(async (req) => {
  const { claims, branchScope } = requireAdminOrBranchAuth(req);
  const body = await parseBody(req, adminGoodsReceiptCreateSchema);
  const createdByAdminId = claims.type === 'admin' ? claims.sub : null;

  // Resolve the PO (if any) and derive branch / supplier from it.
  const po = body.poId
    ? await db.purchaseOrder.findUnique({ where: { id: body.poId }, include: { items: true } })
    : null;
  if (body.poId && !po) throw Errors.notFound('Purchase order');

  const branchId = branchScope ?? po?.branchId ?? body.branchId;
  if (!branchId) throw Errors.badRequest('Branch is required.');
  if (branchScope && po && po.branchId !== branchScope) {
    throw Errors.forbidden('This purchase order belongs to another branch.');
  }
  const supplierId = po?.supplierId ?? body.supplierId ?? null;

  const [branch, products] = await Promise.all([
    db.branch.findUnique({ where: { id: branchId }, select: { id: true } }),
    db.product.findMany({
      where: { id: { in: body.items.map((i) => i.productId) } },
      select: { id: true, isActive: true, trackBatches: true, name: true },
    }),
  ]);
  if (!branch) throw Errors.notFound('Branch');
  const productMap = new Map(products.map((p) => [p.id, p]));
  if (body.items.some((i) => !productMap.has(i.productId))) {
    throw Errors.badRequest('One or more selected products no longer exist.');
  }
  // Batch-tracked products require a batch number on receipt.
  for (const it of body.items) {
    const p = productMap.get(it.productId);
    if (p?.trackBatches && !it.batchNo) {
      throw Errors.badRequest(`"${p.name}" is batch-tracked — enter a batch number.`);
    }
  }

  const orgId = await resolveOrgId();
  const warehouseId = await getDefaultWarehouseId(db, branchId);

  const grn = await db.$transaction(async (tx) => {
    const number = await nextDocumentNumber(tx, orgId, 'grn', 'GRN');
    const createdGrn = await tx.goodsReceipt.create({
      data: {
        orgId,
        branchId,
        supplierId,
        poId: po?.id ?? null,
        number,
        receivedAt: body.receivedAt ? new Date(body.receivedAt) : new Date(),
        notes: body.notes ?? null,
        createdByAdminId,
      },
    });

    // Raise stock: per line — capture batch (if tracked), GRN item, stock, movement.
    for (const it of body.items) {
      const product = productMap.get(it.productId);
      let batchId: string | null = null;
      if (product?.trackBatches && it.batchNo) {
        batchId = await receiveBatchStock(tx, {
          productId: it.productId,
          warehouseId,
          branchId,
          batchNo: it.batchNo,
          mfgDate: it.mfgDate ? new Date(it.mfgDate) : null,
          expiryDate: it.expiryDate ? new Date(it.expiryDate) : null,
          supplierId,
          quantity: it.quantity,
        });
      }
      await tx.goodsReceiptItem.create({
        data: { grnId: createdGrn.id, productId: it.productId, quantity: it.quantity, batchId },
      });
      const stock = await tx.inventoryStock.upsert({
        where: { warehouseId_productId: { warehouseId, productId: it.productId } },
        create: { branchId, warehouseId, productId: it.productId, quantity: 0 },
        update: {},
      });
      await tx.inventoryStock.update({
        where: { id: stock.id },
        data: { quantity: stock.quantity + it.quantity },
      });
      await tx.inventoryMovement.create({
        data: {
          branchId,
          warehouseId,
          productId: it.productId,
          batchId,
          type: 'purchase',
          delta: it.quantity,
          reason: 'Goods receipt',
          ref: number,
          createdByAdminId,
        },
      });
    }

    // If against a PO, bump received quantities + recompute status.
    if (po) {
      for (const it of body.items) {
        const line = po.items.find((l) => l.productId === it.productId);
        if (line) {
          await tx.purchaseOrderItem.update({
            where: { id: line.id },
            data: { quantityReceived: line.quantityReceived + it.quantity },
          });
        }
      }
      const refreshed = await tx.purchaseOrderItem.findMany({ where: { poId: po.id } });
      const allReceived = refreshed.every((l) => l.quantityReceived >= l.quantity);
      const anyReceived = refreshed.some((l) => l.quantityReceived > 0);
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { status: allReceived ? 'received' : anyReceived ? 'partially_received' : po.status },
      });
    }

    return tx.goodsReceipt.findUniqueOrThrow({
      where: { id: createdGrn.id },
      include: goodsReceiptInclude,
    });
  });

  await recordAudit({
    actor: actorFromClaims(claims),
    action: 'create',
    entity: 'goods_receipt',
    entityId: grn.id,
    branchId,
    summary: `Received ${grn.number}${po ? ` against ${po.number}` : ''} (${body.items.length} lines)`,
  });
  return created(toAdminGoodsReceipt(grn as GoodsReceiptWithRelations));
});
