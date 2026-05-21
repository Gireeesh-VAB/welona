import { db } from '@/lib/db';
import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { DELIVERY_TRANSITIONS, assertTransition } from '@/lib/sales/transitions';
import { serializeDelivery } from '@/lib/sales/serializers';

type Ctx = { params: { id: string } };

/** POST /api/v1/sales/deliveries/[id]/dispatch — mark a delivery dispatched. */
export const POST = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'sales:update');

  const delivery = await db.delivery.findFirst({
    where: { id: params.id, orgId: claims.orgId },
  });
  if (!delivery) throw Errors.notFound('Delivery');
  assertTransition(DELIVERY_TRANSITIONS, delivery.status, 'dispatched', 'delivery');

  const updated = await db.delivery.update({
    where: { id: params.id },
    data: { status: 'dispatched', dispatchedAt: new Date(), handledById: claims.sub },
  });
  return ok(serializeDelivery(updated));
});
