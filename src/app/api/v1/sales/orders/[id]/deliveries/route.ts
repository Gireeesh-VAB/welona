import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok, created } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { deliveryCreateSchema } from '@/lib/sales/schemas';
import { serializeDelivery } from '@/lib/sales/serializers';

type Ctx = { params: { id: string } };

/** GET /api/v1/sales/orders/[id]/deliveries — deliveries for an order. */
export const GET = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'sales:read');

  const order = await db.salesOrder.findFirst({
    where: { id: params.id, orgId: claims.orgId },
  });
  if (!order) throw Errors.notFound('Order');

  const deliveries = await db.delivery.findMany({
    where: { orderId: params.id },
    orderBy: { createdAt: 'desc' },
  });
  return ok(deliveries.map(serializeDelivery));
});

/**
 * POST /api/v1/sales/orders/[id]/deliveries — schedule a delivery covering
 * some or all of the order's outstanding line quantities.
 */
export const POST = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'sales:update');
  const body = await parseBody(req, deliveryCreateSchema);

  const order = await db.salesOrder.findFirst({
    where: { id: params.id, orgId: claims.orgId },
    include: { items: true },
  });
  if (!order) throw Errors.notFound('Order');
  if (order.status === 'cancelled') {
    throw Errors.badRequest('Cannot add a delivery to a cancelled order');
  }

  // Validate each line against the order's outstanding quantities.
  for (const line of body.lines) {
    const item = order.items.find((i) => i.id === line.orderItemId);
    if (!item) throw Errors.badRequest('A delivery line refers to an unknown order item');
    const remaining = item.quantity - item.quantityDelivered;
    if (line.quantity > remaining) {
      throw Errors.badRequest(
        `Delivery quantity for "${item.description}" exceeds the outstanding ${remaining}`,
      );
    }
  }

  const delivery = await db.delivery.create({
    data: {
      orgId: claims.orgId,
      orderId: order.id,
      status: 'scheduled',
      scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : null,
      trackingRef: body.trackingRef || null,
      notes: body.notes || null,
      lineQuantities: JSON.stringify(body.lines),
    },
  });

  return created(serializeDelivery(delivery));
});
