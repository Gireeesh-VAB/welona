import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { orderUpdateSchema } from '@shared/schemas/sales';
import { serializeDelivery } from '@/lib/sales/serializers';
import { orderDetailInclude } from '@/lib/sales/includes';

type Ctx = { params: { id: string } };

/** GET /api/v1/sales/orders/[id] — order detail with items, deliveries, invoices. */
export const GET = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'sales:read');

  const order = await db.salesOrder.findFirst({
    where: { id: params.id, orgId: claims.orgId },
    include: orderDetailInclude,
  });
  if (!order) throw Errors.notFound('Order');

  return ok({ ...order, deliveries: order.deliveries.map(serializeDelivery) });
});

/** PATCH /api/v1/sales/orders/[id] — reassign salesperson or edit notes. */
export const PATCH = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'sales:update');

  const order = await db.salesOrder.findFirst({
    where: { id: params.id, orgId: claims.orgId },
  });
  if (!order) throw Errors.notFound('Order');

  const body = await parseBody(req, orderUpdateSchema);
  if (body.ownerStaffId) {
    const owner = await db.staff.findFirst({
      where: { id: body.ownerStaffId, orgId: claims.orgId },
    });
    if (!owner) throw Errors.badRequest('Selected salesperson does not exist');
  }

  const updated = await db.salesOrder.update({
    where: { id: params.id },
    data: {
      ownerStaffId: body.ownerStaffId ?? undefined,
      notes: body.notes !== undefined ? body.notes || null : undefined,
    },
    include: orderDetailInclude,
  });

  return ok({ ...updated, deliveries: updated.deliveries.map(serializeDelivery) });
});
