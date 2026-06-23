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

    // Resolve source warehouse for deduction. If not supplied, pick the warehouse
    // with the highest stock for the first product (best-available heuristic).
    let sourceWarehouseId: string | null = body.sourceWarehouseId ?? null;
    if (!sourceWarehouseId) {
      const firstItem = indent.items[0];
      if (firstItem) {
        const best = await db.inventoryStock.findFirst({
          where: { productId: firstItem.productId },
          orderBy: { quantity: 'desc' },
          select: { warehouseId: true },
        });
        sourceWarehouseId = best?.warehouseId ?? null;
      }
    }

    // Build a map of itemId → per-item warehouseId override from the request body
    const itemWhMap = new Map(
      body.items.filter((i) => i.warehouseId).map((i) => [i.itemId, i.warehouseId as string]),
    );

    const result = await db.$transaction(async (tx) => {
      for (const item of indent.items) {
        const qty = fulfillMap.get(item.id)!;
        await tx.stockIndentItem.update({
          where: { id: item.id },
          data: { fulfilledQty: qty },
        });

        // Per-item warehouse takes priority; fall back to request-level sourceWarehouseId; then auto-pick
        let whId: string | null = itemWhMap.get(item.id) ?? sourceWarehouseId;
        if (!whId && qty > 0) {
          const best = await tx.inventoryStock.findFirst({
            where: { productId: item.productId },
            orderBy: { quantity: 'desc' },
            select: { warehouseId: true },
          });
          whId = best?.warehouseId ?? null;
        }

        if (whId && qty > 0) {
          const stock = await tx.inventoryStock.findUnique({
            where: { warehouseId_productId: { warehouseId: whId, productId: item.productId } },
            select: { quantity: true, branchId: true },
          });
          if (stock) {
            await tx.inventoryStock.update({
              where: { warehouseId_productId: { warehouseId: whId, productId: item.productId } },
              data: { quantity: { decrement: qty } },
            });
            await tx.inventoryMovement.create({
              data: {
                branchId: stock.branchId,
                warehouseId: whId,
                productId: item.productId,
                type: 'transfer_out',
                delta: -qty,
                reason: `Dispatched to branch (indent ${indent.number ?? indent.id})`,
                ref: indent.number ?? indent.id,
                createdByAdminId,
              },
            });
          }
        }
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
