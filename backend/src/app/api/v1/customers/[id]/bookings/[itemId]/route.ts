import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { bookingUpdateSchema } from '@shared/schemas/customer-modules';

type Ctx = { params: { id: string; itemId: string } };

const paySchema = z.object({ paidAmount: z.number().int().nonnegative() });

/** PATCH /api/v1/customers/[id]/bookings/[itemId] — update a booking. */
export const PATCH = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'bookings:update');

  const booking = await db.booking.findFirst({
    where: { id: params.itemId, customerId: params.id, orgId: claims.orgId },
  });
  if (!booking) throw Errors.notFound('Booking');

  const raw = await req.json();

  // Payment shorthand: { paidAmount: N }
  if ('paidAmount' in raw) {
    const { paidAmount } = paySchema.parse(raw);
    const capped = Math.min(paidAmount, booking.netAmount);
    const updated = await db.booking.update({
      where: { id: params.itemId },
      data: { paidAmount: capped },
    });
    return ok(updated);
  }

  const body = bookingUpdateSchema.parse(raw);
  const data: Prisma.BookingUpdateInput = {};
  if (body.serviceName !== undefined) data.serviceName = body.serviceName;
  if (body.scheduledAt !== undefined) data.scheduledAt = new Date(body.scheduledAt);
  if (body.status !== undefined) data.status = body.status;
  if (body.notes !== undefined) data.notes = body.notes || null;

  const updated = await db.booking.update({ where: { id: params.itemId }, data });
  return ok(updated);
});
