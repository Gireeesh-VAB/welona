import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { orderStatusSchema } from '@/lib/sales/schemas';
import { ORDER_TRANSITIONS, assertTransition } from '@/lib/sales/transitions';
import { orderDetailInclude } from '@/lib/sales/includes';

type Ctx = { params: { id: string } };

/**
 * POST /api/v1/sales/orders/[id]/status — confirm or cancel an order.
 * Delivery-driven statuses (partially_delivered, delivered) are set by the
 * delivery endpoints, not here.
 */
export const POST = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'sales:update');
  const body = await parseBody(req, orderStatusSchema);

  const order = await db.salesOrder.findFirst({
    where: { id: params.id, orgId: claims.orgId },
  });
  if (!order) throw Errors.notFound('Order');
  assertTransition(ORDER_TRANSITIONS, order.status, body.status, 'order');

  const updated = await db.salesOrder.update({
    where: { id: params.id },
    data: { status: body.status },
    include: orderDetailInclude,
  });
  return ok(updated);
});
