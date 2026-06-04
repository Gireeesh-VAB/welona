import { db } from '@/lib/db';
import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminOrBranchAuth } from '@/lib/auth/service';
import { resolveOrgId } from '@/lib/org';
import { DELIVERY_TRANSITIONS, assertTransition } from '@/lib/sales/transitions';
import { recomputeOrderDeliveryStatus } from '@/lib/sales/service';
import { applyDeliverySaleStock } from '@/lib/sales/inventory';
import { serializeDelivery, type DeliveryLine } from '@/lib/sales/serializers';

type Ctx = { params: { id: string } };

/**
 * POST /api/v1/admin/sales/deliveries/[id]/complete — mark a delivery delivered.
 * Adds the delivered quantities to each order line and recomputes the
 * order's delivery status (confirmed → partially_delivered → delivered).
 */
export const POST = route<Ctx>(async (req, { params }) => {
  const { branchScope } = requireAdminOrBranchAuth(req);
  const orgId = await resolveOrgId();

  // Deliveries have no branchId column, so we scope through the parent order.
  const delivery = await db.delivery.findFirst({
    where: {
      id: params.id,
      orgId,
      ...(branchScope && { order: { branchId: branchScope } }),
    },
  });
  if (!delivery) throw Errors.notFound('Delivery');
  assertTransition(DELIVERY_TRANSITIONS, delivery.status, 'delivered', 'delivery');

  let lines: DeliveryLine[] = [];
  try {
    const parsed = JSON.parse(delivery.lineQuantities);
    if (Array.isArray(parsed)) lines = parsed as DeliveryLine[];
  } catch {
    lines = [];
  }

  // The order supplies the branch (→ default warehouse) + number for the ref.
  const order = await db.salesOrder.findUnique({
    where: { id: delivery.orderId },
    select: { branchId: true, number: true },
  });

  const updated = await db.$transaction(async (tx) => {
    for (const line of lines) {
      await tx.orderItem.update({
        where: { id: line.orderItemId },
        data: { quantityDelivered: { increment: line.quantity } },
      });
    }
    // Auto-deduct stock for product lines (services are skipped inside).
    await applyDeliverySaleStock(tx, {
      branchId: order?.branchId ?? null,
      lines,
      ref: order?.number ?? delivery.id,
    });
    const result = await tx.delivery.update({
      where: { id: params.id },
      data: { status: 'delivered', deliveredAt: new Date(), handledById: null },
    });
    await recomputeOrderDeliveryStatus(tx, delivery.orderId);
    return result;
  });

  return ok(serializeDelivery(updated));
});
