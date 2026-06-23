import { z } from 'zod';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth } from '@/lib/auth/service';
import { resolveWarehouseId } from '@/lib/warehouse';
import { stockIndentInclude, toStockIndent, type StockIndentWithRelations } from '@/lib/admin-indent-mapper';

interface RouteContext { params: { id: string } }

const branchReceiveSchema = z.object({
  action: z.literal('deliver'),
  items: z.array(
    z.object({
      itemId: z.string().min(1),
      receivedQty: z.coerce.number().int().min(0),
    }),
  ).min(1),
  notes: z.string().trim().max(500).optional(),
});

/**
 * PATCH /api/v1/indents/[id]
 * Branch staff confirms receipt of a dispatched indent with per-item quantities.
 * Branch enters actually accepted qty (quality check) — may differ from dispatched qty.
 * Credits only the accepted quantities to branch inventory.
 */
export const PATCH = route<RouteContext>(async (req, { params }) => {
  const claims = requireAuth(req);
  const branchId = claims.branchIds[0] ?? null;
  if (!branchId) throw Errors.badRequest('Branch context is required.');

  const body = await parseBody(req, branchReceiveSchema);

  const indent = await db.stockIndent.findUnique({
    where: { id: params.id },
    include: { items: true },
  });
  if (!indent) throw Errors.notFound('Indent');
  if (indent.branchId !== branchId) throw Errors.notFound('Indent');
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
    const warehouseId = await resolveWarehouseId(tx, branchId);

    for (const item of indent.items) {
      const qty = receiveMap.get(item.id)!;
      await tx.stockIndentItem.update({ where: { id: item.id }, data: { receivedQty: qty } });

      if (qty > 0) {
        await tx.inventoryStock.upsert({
          where: { warehouseId_productId: { warehouseId, productId: item.productId } },
          create: { branchId, warehouseId, productId: item.productId, quantity: qty },
          update: { quantity: { increment: qty } },
        });
        await tx.inventoryMovement.create({
          data: {
            branchId,
            warehouseId,
            productId: item.productId,
            type: 'purchase',
            delta: qty,
            reason: `Indent delivered to branch (${indent.number ?? indent.id})`,
            ref: indent.number ?? indent.id,
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
});
