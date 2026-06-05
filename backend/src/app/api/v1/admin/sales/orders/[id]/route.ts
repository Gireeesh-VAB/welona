import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { resolveOrgId } from '@/lib/org';
import { orderUpdateSchema } from '@shared/schemas/sales';
import { serializeDelivery } from '@/lib/sales/serializers';
import { orderDetailInclude } from '@/lib/sales/includes';

type Ctx = { params: { id: string } };

/** GET /api/v1/admin/sales/orders/[id] — order detail with items, deliveries, invoices. */
export const GET = route<Ctx>(async (req, { params }) => {
  requireAdminAuth(req);
  const orgId = await resolveOrgId();

  const order = await db.salesOrder.findFirst({
    where: { id: params.id, orgId },
    include: orderDetailInclude,
  });
  if (!order) throw Errors.notFound('Order');

  return ok({ ...order, deliveries: order.deliveries.map(serializeDelivery) });
});

/** PATCH /api/v1/admin/sales/orders/[id] — reassign salesperson or edit notes. */
export const PATCH = route<Ctx>(async (req, { params }) => {
  requireAdminAuth(req);
  const orgId = await resolveOrgId();

  const order = await db.salesOrder.findFirst({
    where: { id: params.id, orgId },
  });
  if (!order) throw Errors.notFound('Order');

  const body = await parseBody(req, orderUpdateSchema);
  if (body.ownerStaffId) {
    const owner = await db.staff.findFirst({
      where: { id: body.ownerStaffId, orgId },
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
