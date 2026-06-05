import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { resolveOrgId } from '@/lib/org';
import { bookingUpdateSchema } from '@shared/schemas/customer-modules';

type Ctx = { params: { id: string; itemId: string } };

/** PATCH /api/v1/admin/customers/[id]/bookings/[itemId] — update a booking. */
export const PATCH = route<Ctx>(async (req, { params }) => {
  requireAdminAuth(req);
  const orgId = await resolveOrgId();

  const booking = await db.booking.findFirst({
    where: {
      id: params.itemId,
      customerId: params.id,
      orgId,
      
    },
  });
  if (!booking) throw Errors.notFound('Booking');

  const body = await parseBody(req, bookingUpdateSchema);
  const data: Prisma.BookingUpdateInput = {};
  if (body.serviceName !== undefined) data.serviceName = body.serviceName;
  if (body.scheduledAt !== undefined) data.scheduledAt = new Date(body.scheduledAt);
  if (body.status !== undefined) data.status = body.status;
  if (body.notes !== undefined) data.notes = body.notes || null;

  const updated = await db.booking.update({ where: { id: params.itemId }, data });
  return ok(updated);
});
