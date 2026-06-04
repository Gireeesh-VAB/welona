import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminOrBranchAuth } from '@/lib/auth/service';
import { getDefaultWarehouseId } from '@/lib/warehouse';
import { recordAudit, actorFromClaims } from '@/lib/audit';
import { adminStockTransferActionSchema } from '@shared/schemas/admin-stock-transfers';
import {
  toAdminStockTransfer,
  stockTransferInclude,
  type StockTransferWithRelations,
} from '@/lib/admin-stock-transfer-mapper';

interface RouteContext {
  params: { id: string };
}

/** Load a transfer visible to the caller (source or destination in scope). */
async function loadScoped(id: string, branchScope: string | null) {
  const t = await db.stockTransfer.findUnique({ where: { id }, include: stockTransferInclude });
  if (!t) throw Errors.notFound('Stock transfer');
  if (branchScope && t.fromBranchId !== branchScope && t.toBranchId !== branchScope) {
    throw Errors.notFound('Stock transfer');
  }
  return t;
}

export const GET = route<RouteContext>(async (req, { params }) => {
  const { branchScope } = requireAdminOrBranchAuth(req);
  const t = await loadScoped(params.id, branchScope);
  return ok(toAdminStockTransfer(t as StockTransferWithRelations));
});

export const PUT = route<RouteContext>(async (req, { params }) => {
  const { claims, branchScope } = requireAdminOrBranchAuth(req);
  const { action } = await parseBody(req, adminStockTransferActionSchema);
  const t = await loadScoped(params.id, branchScope);
  const createdByAdminId = claims.type === 'admin' ? claims.sub : null;

  if (action === 'cancel') {
    if (t.status !== 'requested') {
      throw Errors.badRequest('Only a requested transfer can be cancelled.');
    }
    const updated = await db.stockTransfer.update({
      where: { id: t.id },
      data: { status: 'cancelled' },
      include: stockTransferInclude,
    });
    await recordAudit({
      actor: actorFromClaims(claims),
      action,
      entity: 'stock_transfer',
      entityId: t.id,
      branchId: t.fromBranchId,
      summary: `${action} ${t.number}: ${t.fromBranch.name} → ${t.toBranch.name}`,
    });
    return ok(toAdminStockTransfer(updated as StockTransferWithRelations));
  }

  if (action === 'dispatch') {
    if (t.status !== 'requested') {
      throw Errors.badRequest('Only a requested transfer can be dispatched.');
    }
    if (branchScope && t.fromBranchId !== branchScope) {
      throw Errors.forbidden('Only the source branch can dispatch this transfer.');
    }
    const fromWarehouseId = await getDefaultWarehouseId(db, t.fromBranchId);
    const updated = await db.$transaction(async (tx) => {
      for (const it of t.items) {
        const stock = await tx.inventoryStock.findUnique({
          where: { warehouseId_productId: { warehouseId: fromWarehouseId, productId: it.productId } },
        });
        const onHand = stock?.quantity ?? 0;
        if (onHand < it.quantity) {
          throw Errors.conflict(
            `Not enough stock at the source for ${it.productId}: have ${onHand}, need ${it.quantity}.`,
          );
        }
        await tx.inventoryStock.update({
          where: { id: stock!.id },
          data: { quantity: onHand - it.quantity },
        });
        await tx.inventoryMovement.create({
          data: {
            branchId: t.fromBranchId,
            warehouseId: fromWarehouseId,
            productId: it.productId,
            type: 'transfer_out',
            delta: -it.quantity,
            reason: 'Stock transfer dispatched',
            ref: t.number,
            createdByAdminId,
          },
        });
      }
      return tx.stockTransfer.update({
        where: { id: t.id },
        data: { status: 'dispatched', dispatchedAt: new Date() },
        include: stockTransferInclude,
      });
    });
    await recordAudit({
      actor: actorFromClaims(claims),
      action,
      entity: 'stock_transfer',
      entityId: t.id,
      branchId: t.fromBranchId,
      summary: `${action} ${t.number}: ${t.fromBranch.name} → ${t.toBranch.name}`,
    });
    return ok(toAdminStockTransfer(updated as StockTransferWithRelations));
  }

  // action === 'receive'
  if (t.status !== 'dispatched') {
    throw Errors.badRequest('Only a dispatched transfer can be received.');
  }
  if (branchScope && t.toBranchId !== branchScope) {
    throw Errors.forbidden('Only the destination branch can receive this transfer.');
  }
  const toWarehouseId = await getDefaultWarehouseId(db, t.toBranchId);
  const updated = await db.$transaction(async (tx) => {
    for (const it of t.items) {
      const stock = await tx.inventoryStock.upsert({
        where: { warehouseId_productId: { warehouseId: toWarehouseId, productId: it.productId } },
        create: { branchId: t.toBranchId, warehouseId: toWarehouseId, productId: it.productId, quantity: 0 },
        update: {},
      });
      await tx.inventoryStock.update({
        where: { id: stock.id },
        data: { quantity: stock.quantity + it.quantity },
      });
      await tx.inventoryMovement.create({
        data: {
          branchId: t.toBranchId,
          warehouseId: toWarehouseId,
          productId: it.productId,
          type: 'transfer_in',
          delta: it.quantity,
          reason: 'Stock transfer received',
          ref: t.number,
          createdByAdminId,
        },
      });
    }
    return tx.stockTransfer.update({
      where: { id: t.id },
      data: { status: 'received', receivedAt: new Date() },
      include: stockTransferInclude,
    });
  });
  return ok(toAdminStockTransfer(updated as StockTransferWithRelations));
});

export const DELETE = route<RouteContext>(async (req, { params }) => {
  const { branchScope } = requireAdminOrBranchAuth(req);
  const t = await loadScoped(params.id, branchScope);
  if (t.status !== 'requested' && t.status !== 'cancelled') {
    throw Errors.conflict('Only a requested or cancelled transfer can be deleted.');
  }
  try {
    await db.stockTransfer.delete({ where: { id: t.id } });
    return ok({ deleted: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw Errors.notFound('Stock transfer');
    }
    throw error;
  }
});
