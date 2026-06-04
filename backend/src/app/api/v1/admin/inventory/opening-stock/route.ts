import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { created } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminOrBranchAuth } from '@/lib/auth/service';
import { resolveWarehouseId } from '@/lib/warehouse';
import { adminInventoryOpeningStockSchema } from '@shared/schemas/admin-inventory';

/**
 * POST /api/v1/admin/inventory/opening-stock
 *
 * Bulk-set the opening quantity for many products at one branch. Idempotent:
 * each (branch, product) gets exactly one `opening` movement total — re-runs
 * adjust the delta so the recorded quantity matches what the caller supplied.
 */
export const POST = route(async (req) => {
  const { claims, branchScope } = requireAdminOrBranchAuth(req);
  const body = await parseBody(req, adminInventoryOpeningStockSchema);
  // Branch sessions can only set opening stock for their own branch.
  const branchId = branchScope ?? body.branchId;
  const createdByAdminId = claims.type === 'admin' ? claims.sub : null;

  const branch = await db.branch.findUnique({
    where: { id: branchId },
    select: { id: true },
  });
  if (!branch) throw Errors.notFound('Branch');

  const warehouseId = await resolveWarehouseId(db, branchId, body.warehouseId);

  let written = 0;
  await db.$transaction(async (tx) => {
    for (const entry of body.entries) {
      const existingOpening = await tx.inventoryMovement.findFirst({
        where: {
          warehouseId,
          productId: entry.productId,
          type: 'opening',
        },
      });
      const stock = await tx.inventoryStock.upsert({
        where: {
          warehouseId_productId: { warehouseId, productId: entry.productId },
        },
        create: {
          branchId,
          warehouseId,
          productId: entry.productId,
          quantity: 0,
        },
        update: {},
      });

      // Target quantity = existing non-opening movements + new opening qty.
      // i.e., adjust the opening row so the total nets out to `entry.quantity`.
      const nonOpeningSum = stock.quantity - (existingOpening?.delta ?? 0);
      const targetOpening = entry.quantity - nonOpeningSum;
      const newQuantity = nonOpeningSum + targetOpening;

      await tx.inventoryStock.update({
        where: { id: stock.id },
        data: { quantity: newQuantity },
      });

      if (existingOpening) {
        if (existingOpening.delta !== targetOpening) {
          await tx.inventoryMovement.update({
            where: { id: existingOpening.id },
            data: { delta: targetOpening, reason: 'Opening stock (updated)' },
          });
        }
      } else {
        await tx.inventoryMovement.create({
          data: {
            branchId,
            warehouseId,
            productId: entry.productId,
            type: 'opening',
            delta: targetOpening,
            reason: 'Opening stock',
            createdByAdminId,
          },
        });
      }
      written += 1;
    }
  });

  return created({ entries: written, branchId });
});
