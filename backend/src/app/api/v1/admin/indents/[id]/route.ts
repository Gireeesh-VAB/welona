import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { resolveWarehouseId } from '@/lib/warehouse';
import { stockIndentActionSchema } from '@shared/schemas/admin-indents';
import { stockIndentInclude, toStockIndent, type StockIndentWithRelations } from '@/lib/admin-indent-mapper';

interface RouteContext { params: { id: string } }

/**
 * PATCH /api/v1/admin/indents/[id] — lifecycle actions on a stock indent.
 *
 * Actions:
 *  approve  — set approvedQty per item; status pending → approved
 *  reject   — status pending|approved → rejected
 *  dispatch — record delivery info + fulfilledQty; status approved → dispatched (NO inventory movement)
 *  receive  — credit receivedQty to branch warehouse; status dispatched → received
 *  close    — terminal; status received → closed
 */
export const PATCH = route<RouteContext>(async (req, { params }) => {
  const admin = requireAdminAuth(req);
  const body = await parseBody(req, stockIndentActionSchema);
  const createdByAdminId = admin.type === 'admin' ? admin.sub : null;

  const indent = await db.stockIndent.findUnique({
    where: { id: params.id },
    include: { items: true },
  });
  if (!indent) throw Errors.notFound('Indent');

  // ── APPROVE ──────────────────────────────────────────────────────────────
  if (body.action === 'approve') {
    if (indent.status !== 'pending') {
      throw Errors.badRequest('Only a pending indent can be approved.');
    }
    const approvalMap = new Map(body.items.map((i) => [i.itemId, i]));
    for (const item of indent.items) {
      if (!approvalMap.has(item.id)) {
        throw Errors.badRequest(`Missing approved qty for item ${item.id}.`);
      }
    }

    const result = await db.$transaction(async (tx) => {
      for (const item of indent.items) {
        const approval = approvalMap.get(item.id)!;
        const approvedQty = approval.approvedQty;
        const rejectedQty = item.requestedQty - approvedQty;
        await tx.stockIndentItem.update({
          where: { id: item.id },
          data: {
            approvedQty,
            rejectedQty: rejectedQty > 0 ? rejectedQty : 0,
            rejectionReason: rejectedQty > 0 ? (approval.rejectionReason ?? null) : null,
          },
        });
      }
      return tx.stockIndent.update({
        where: { id: indent.id },
        data: { status: 'approved', approvedAt: new Date(), notes: body.notes ?? indent.notes },
        include: stockIndentInclude,
      });
    });
    return ok(toStockIndent(result as StockIndentWithRelations));
  }

  // ── REJECT ───────────────────────────────────────────────────────────────
  if (body.action === 'reject') {
    if (indent.status !== 'pending' && indent.status !== 'approved') {
      throw Errors.badRequest('Only pending or approved indents can be rejected.');
    }
    const result = await db.stockIndent.update({
      where: { id: indent.id },
      data: { status: 'rejected', rejectedAt: new Date(), notes: body.notes ?? indent.notes },
      include: stockIndentInclude,
    });
    return ok(toStockIndent(result as StockIndentWithRelations));
  }

  // ── DISPATCH ─────────────────────────────────────────────────────────────
  if (body.action === 'dispatch') {
    if (indent.status !== 'approved') {
      throw Errors.badRequest('Only an approved indent can be dispatched.');
    }
    const fulfillMap = new Map(body.items.map((i) => [i.itemId, i.fulfilledQty]));
    for (const item of indent.items) {
      if (!fulfillMap.has(item.id)) {
        throw Errors.badRequest(`Missing fulfilled qty for item ${item.id}.`);
      }
    }

    const result = await db.$transaction(async (tx) => {
      for (const item of indent.items) {
        await tx.stockIndentItem.update({
          where: { id: item.id },
          data: { fulfilledQty: fulfillMap.get(item.id)! },
        });
      }
      return tx.stockIndent.update({
        where: { id: indent.id },
        data: {
          status: 'dispatched',
          dispatchedAt: new Date(),
          vehicleNumber: body.vehicleNumber ?? null,
          driverName: body.driverName ?? null,
          driverMobile: body.driverMobile ?? null,
          expectedDeliveryAt: body.expectedDeliveryAt ? new Date(body.expectedDeliveryAt) : null,
          deliveryNotes: body.deliveryNotes ?? null,
        },
        include: stockIndentInclude,
      });
    });
    return ok(toStockIndent(result as StockIndentWithRelations));
  }

  // ── DELIVER ──────────────────────────────────────────────────────────────
  if (body.action === 'deliver') {
    if (indent.status !== 'dispatched') {
      throw Errors.badRequest('Only a dispatched indent can be marked as delivered.');
    }
    const receiveMap = new Map(body.items.map((i) => [i.itemId, i.receivedQty]));
    for (const item of indent.items) {
      if (!receiveMap.has(item.id)) {
        throw Errors.badRequest(`Missing received qty for item ${item.id}.`);
      }
    }

    const result = await db.$transaction(async (tx) => {
      const warehouseId = await resolveWarehouseId(tx, indent.branchId);

      for (const item of indent.items) {
        const qty = receiveMap.get(item.id)!;
        await tx.stockIndentItem.update({ where: { id: item.id }, data: { receivedQty: qty } });

        if (qty > 0) {
          await tx.inventoryStock.upsert({
            where: { warehouseId_productId: { warehouseId, productId: item.productId } },
            create: { branchId: indent.branchId, warehouseId, productId: item.productId, quantity: qty },
            update: { quantity: { increment: qty } },
          });
          await tx.inventoryMovement.create({
            data: {
              branchId: indent.branchId,
              warehouseId,
              productId: item.productId,
              type: 'purchase',
              delta: qty,
              reason: `Indent delivered (${indent.number ?? indent.id})`,
              ref: indent.number ?? indent.id,
              createdByAdminId,
            },
          });
        }
      }

      return tx.stockIndent.update({
        where: { id: indent.id },
        data: { status: 'delivered', receivedAt: new Date(), notes: body.notes ?? indent.notes },
        include: stockIndentInclude,
      });
    });
    return ok(toStockIndent(result as StockIndentWithRelations));
  }

  // ── CLOSE ────────────────────────────────────────────────────────────────
  if (body.action === 'close') {
    if (indent.status !== 'delivered') {
      throw Errors.badRequest('Only a delivered indent can be closed.');
    }
    const result = await db.stockIndent.update({
      where: { id: indent.id },
      data: { status: 'closed', closedAt: new Date(), notes: body.notes ?? indent.notes },
      include: stockIndentInclude,
    });
    return ok(toStockIndent(result as StockIndentWithRelations));
  }

  throw Errors.badRequest('Unknown action.');
});
