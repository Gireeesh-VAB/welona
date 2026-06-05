import { db } from '@/lib/db';
import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { resolveOrgId } from '@/lib/org';
import { DELIVERY_TRANSITIONS, assertTransition } from '@/lib/sales/transitions';
import { serializeDelivery } from '@/lib/sales/serializers';

type Ctx = { params: { id: string } };

/** POST /api/v1/admin/sales/deliveries/[id]/dispatch — mark a delivery dispatched. */
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
  assertTransition(DELIVERY_TRANSITIONS, delivery.status, 'dispatched', 'delivery');

  const updated = await db.delivery.update({
    where: { id: params.id },
    data: { status: 'dispatched', dispatchedAt: new Date(), handledById: null },
  });
  return ok(serializeDelivery(updated));
});
