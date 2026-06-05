import { db } from '@/lib/db';
import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { resolveOrgId } from '@/lib/org';
import { DELIVERY_TRANSITIONS, assertTransition } from '@/lib/sales/transitions';
import { recomputeOrderDeliveryStatus } from '@/lib/sales/service';
import { applyDeliverySaleStock } from '@/lib/sales/inventory';
import { serializeDelivery, type DeliveryLine } from '@/lib/sales/serializers';

type Ctx = { params: { id: string } };

/**
 * POST /api/v1/admin/sales/deliveries/[id]/return — mark a delivery returned.
 *
 * If the delivery had already been completed (stock was deducted), this
 * reverses it: each product line's stock is added back via a positive `sale`
 * movement (reason "Sales return") and the order lines' delivered quantities
 * are decremented. Returning a not-yet-delivered (dispatched) delivery just
 * sets the status without touching stock.
 */
export const POST = route<Ctx>(async (req, { params }) => {
  requireAdminAuth(req);
  const orgId = await resolveOrgId();

  // Deliveries have no branchId column, so we scope through the parent order.
  const delivery = await db.delivery.findFirst({
    where: {
      id: params.id,
      orgId,
      
    },
  });
  if (!delivery) throw Errors.notFound('Delivery');
  assertTransition(DELIVERY_TRANSITIONS, delivery.status, 'returned', 'delivery');

  const wasDelivered = delivery.status === 'delivered';

  let lines: DeliveryLine[] = [];
  try {
    const parsed = JSON.parse(delivery.lineQuantities);
    if (Array.isArray(parsed)) lines = parsed as DeliveryLine[];
  } catch {
    lines = [];
  }

  const order = await db.salesOrder.findUnique({
    where: { id: delivery.orderId },
    select: { branchId: true, number: true },
  });

  const updated = await db.$transaction(async (tx) => {
    if (wasDelivered) {
      for (const line of lines) {
        await tx.orderItem.update({
          where: { id: line.orderItemId },
          data: { quantityDelivered: { decrement: line.quantity } },
        });
      }
      await applyDeliverySaleStock(tx, {
        branchId: order?.branchId ?? null,
        lines,
        ref: order?.number ?? delivery.id,
        reverse: true,
      });
    }
    const result = await tx.delivery.update({
      where: { id: params.id },
      data: { status: 'returned' },
    });
    await recomputeOrderDeliveryStatus(tx, delivery.orderId);
    return result;
  });

  return ok(serializeDelivery(updated));
});
