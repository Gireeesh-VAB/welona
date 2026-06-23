import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { Errors } from '@/lib/api/errors';
import { getDefaultWarehouseId } from '@/lib/warehouse';
import { z } from 'zod';

type Ctx = { params: { id: string } };

const bodySchema = z.object({
  action: z.enum(['dispatch', 'receive']),
});

const transferInclude = {
  fromBranch: { select: { id: true, name: true, code: true } },
  toBranch: { select: { id: true, name: true, code: true } },
  items: {
    include: {
      product: { select: { id: true, name: true, sku: true, uom: true } },
    },
  },
};

/**
 * PUT /api/v1/inventory/transfers/[id]  { action: 'dispatch' | 'receive' }
 *
 * dispatch — source branch confirms and sends the stock (status: requested → dispatched).
 *            Deducts stock from the source warehouse.
 * receive  — destination branch accepts the incoming stock (status: dispatched → received).
 *            Adds stock to the destination warehouse.
 *
 * Branch scope is enforced: dispatch only allowed by fromBranch, receive only by toBranch.
 */
export const PUT = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'inventory:update');

  const branchId = claims.branchIds?.[0] ?? null;
  if (!branchId) throw Errors.badRequest('No branch associated with this account.');

  const { action } = await parseBody(req, bodySchema);

  const t = await db.stockTransfer.findUnique({
    where: { id: params.id },
    include: { items: true, fromBranch: { select: { id: true, name: true, code: true } }, toBranch: { select: { id: true, name: true, code: true } } },
  });
  if (!t) throw Errors.notFound('Transfer');

  // ---- DISPATCH (source branch sends stock) ----------------------------------
  if (action === 'dispatch') {
    if (t.fromBranchId !== branchId) throw Errors.notFound('Transfer');
    if (t.status !== 'requested') throw Errors.badRequest('Only a requested transfer can be dispatched.');

    const fromWarehouseId = await getDefaultWarehouseId(db, branchId);

    const updated = await db.$transaction(async (tx) => {
      for (const it of t.items) {
        const stock = await tx.inventoryStock.findUnique({
          where: { warehouseId_productId: { warehouseId: fromWarehouseId, productId: it.productId } },
        });
        const onHand = stock?.quantity ?? 0;
        if (onHand < it.quantity) {
          throw Errors.conflict(
            `Not enough stock for product ${it.productId}: have ${onHand}, need ${it.quantity}.`,
          );
        }
        await tx.inventoryStock.update({
          where: { id: stock!.id },
          data: { quantity: onHand - it.quantity },
        });
        await tx.inventoryMovement.create({
          data: {
            branchId,
            warehouseId: fromWarehouseId,
            productId: it.productId,
            type: 'transfer_out',
            delta: -it.quantity,
            reason: 'Stock transfer dispatched',
            ref: t.number,
          },
        });
      }
      return tx.stockTransfer.update({
        where: { id: t.id },
        data: { status: 'dispatched', dispatchedAt: new Date() },
        include: transferInclude,
      });
    });

    return ok(updated);
  }

  // ---- RECEIVE (destination branch accepts stock) ----------------------------
  if (t.toBranchId !== branchId) throw Errors.notFound('Transfer');
  if (t.status !== 'dispatched') throw Errors.badRequest('Only a dispatched transfer can be received.');

  const toWarehouseId = await getDefaultWarehouseId(db, branchId);

  const updated = await db.$transaction(async (tx) => {
    for (const it of t.items) {
      // Auto-assign the product to this branch so it appears in the stock view.
      await tx.branchProduct.upsert({
        where: { branchId_productId: { branchId, productId: it.productId } },
        create: { branchId, productId: it.productId },
        update: {},
      });

      const stock = await tx.inventoryStock.upsert({
        where: { warehouseId_productId: { warehouseId: toWarehouseId, productId: it.productId } },
        create: { branchId, warehouseId: toWarehouseId, productId: it.productId, quantity: 0 },
        update: {},
      });
      await tx.inventoryStock.update({
        where: { id: stock.id },
        data: { quantity: stock.quantity + it.quantity },
      });
      await tx.inventoryMovement.create({
        data: {
          branchId,
          warehouseId: toWarehouseId,
          productId: it.productId,
          type: 'transfer_in',
          delta: it.quantity,
          reason: 'Stock transfer received',
          ref: t.number,
        },
      });
    }
    return tx.stockTransfer.update({
      where: { id: t.id },
      data: { status: 'received', receivedAt: new Date() },
      include: transferInclude,
    });
  });

  return ok(updated);
});
