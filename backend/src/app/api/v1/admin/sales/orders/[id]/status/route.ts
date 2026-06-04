import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminOrBranchAuth } from '@/lib/auth/service';
import { resolveOrgId } from '@/lib/org';
import { orderStatusSchema } from '@shared/schemas/sales';
import { ORDER_TRANSITIONS, assertTransition } from '@/lib/sales/transitions';
import { orderDetailInclude } from '@/lib/sales/includes';

type Ctx = { params: { id: string } };

/**
 * POST /api/v1/admin/sales/orders/[id]/status — confirm or cancel an order.
 * Delivery-driven statuses (partially_delivered, delivered) are set by the
 * delivery endpoints, not here.
 */
export const POST = route<Ctx>(async (req, { params }) => {
  const { branchScope } = requireAdminOrBranchAuth(req);
  const orgId = await resolveOrgId();
  const body = await parseBody(req, orderStatusSchema);

  const order = await db.salesOrder.findFirst({
    where: { id: params.id, orgId, ...(branchScope && { branchId: branchScope }) },
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
