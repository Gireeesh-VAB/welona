import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { resolveWarehouseId } from '@/lib/warehouse';
import { stockIndentUpdateSchema } from '@shared/schemas/admin-indents';

interface RouteContext { params: { id: string } }

/**
 * PATCH /api/v1/admin/indents/[id] — update indent status (approve/reject/fulfil).
 *
 * When status transitions to 'fulfilled', stock is added to the branch's
 * default warehouse and an InventoryMovement record is created for the audit trail.
 */
export const PATCH = route<RouteContext>(async (req, { params }) => {
  const admin = requireAdminAuth(req);
  const body = await parseBody(req, stockIndentUpdateSchema);

  const indent = await db.stockIndent.findUnique({
    where: { id: params.id },
    include: { product: { select: { id: true, name: true, sku: true, uom: true, isActive: true } } },
  });
  if (!indent) throw Errors.notFound('Indent');

  // Prevent double-fulfillment
  if (indent.status === 'fulfilled' && body.status === 'fulfilled') {
    throw Errors.conflict('This indent has already been fulfilled.');
  }

  const result = await db.$transaction(async (tx) => {
    const updated = await tx.stockIndent.update({
      where: { id: params.id },
      data: { status: body.status, notes: body.notes ?? indent.notes },
      include: {
        branch: { select: { id: true, name: true } },
        product: { select: { id: true, name: true, sku: true, uom: true } },
      },
    });

    // On fulfillment: credit stock into the branch's default warehouse
    if (body.status === 'fulfilled') {
      const warehouseId = await resolveWarehouseId(tx, indent.branchId);

      // Upsert stock row then increment quantity
      await tx.inventoryStock.upsert({
        where: { warehouseId_productId: { warehouseId, productId: indent.productId } },
        create: {
          branchId: indent.branchId,
          warehouseId,
          productId: indent.productId,
          quantity: indent.requestedQty,
        },
        update: { quantity: { increment: indent.requestedQty } },
      });

      // Audit trail
      await tx.inventoryMovement.create({
        data: {
          branchId: indent.branchId,
          warehouseId,
          productId: indent.productId,
          type: 'purchase',
          delta: indent.requestedQty,
          reason: `Indent fulfilled (${indent.id})`,
          ref: indent.id,
          createdByAdminId: admin.type === 'admin' ? admin.sub : null,
        },
      });
    }

    return updated;
  });

  return ok({
    id: result.id,
    branchId: result.branchId,
    branchName: result.branch.name,
    product: result.product,
    requestedQty: result.requestedQty,
    status: result.status,
    reason: result.reason,
    notes: result.notes,
    raisedBy: result.raisedBySystemUserId ?? result.raisedByAdminId ?? null,
    createdAt: result.createdAt.toISOString(),
    updatedAt: result.updatedAt.toISOString(),
  });
});
