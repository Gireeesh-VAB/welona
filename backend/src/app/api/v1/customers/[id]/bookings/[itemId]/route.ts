import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { bookingUpdateSchema, bookingPaySchema } from '@shared/schemas/customer-modules';

type Ctx = { params: { id: string; itemId: string } };

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
    const { paidAmount, paymentMode, serviceAllocations } = bookingPaySchema.parse(raw);

    const increment = Math.min(paidAmount, Math.max(0, booking.netAmount - booking.paidAmount));
    if (increment === 0) return ok(booking);

    // Always fetch items so BookingItem.paidAmount is kept in sync for service-wise reporting
    const bk = await db.booking.findUnique({
      where: { id: params.itemId },
      include: { items: true },
    });

    // Build final allocations: explicit list → or auto-distribute proportionally to remaining balance
    let finalAllocations: Array<{ bookingItemId: string; amount: number }> = [];

    if (serviceAllocations?.length) {
      const allocSum = serviceAllocations.reduce((s, a) => s + a.amount, 0);
      if (allocSum !== increment) throw Errors.badRequest('Allocation total must equal the payment amount');

      const itemMap = new Map(bk!.items.map((i) => [i.id, i]));
      for (const alloc of serviceAllocations) {
        const item = itemMap.get(alloc.bookingItemId);
        if (!item) throw Errors.badRequest('Invalid bookingItemId in allocations');
        const remaining = item.lineTotal - item.paidAmount;
        if (alloc.amount > remaining)
          throw Errors.badRequest(`Allocation for "${item.service}" exceeds its remaining balance`);
      }
      finalAllocations = serviceAllocations;
    } else if (bk && bk.items.length > 0) {
      // Auto-distribute proportionally to each item's remaining balance
      const remaining = bk.items.map(i => Math.max(0, i.lineTotal - i.paidAmount));
      const totalRemaining = remaining.reduce((s, r) => s + r, 0);
      if (totalRemaining > 0) {
        let distributed = 0;
        bk.items.forEach((item, idx) => {
          const share = idx === bk.items.length - 1
            ? increment - distributed
            : Math.round((remaining[idx] / totalRemaining) * increment);
          const capped = Math.min(share, remaining[idx]);
          if (capped > 0) finalAllocations.push({ bookingItemId: item.id, amount: capped });
          distributed += capped;
        });
      }
    }

    const updated = await db.$transaction(async (tx) => {
      for (const alloc of finalAllocations) {
        await tx.bookingItem.update({
          where: { id: alloc.bookingItemId },
          data: { paidAmount: { increment: alloc.amount } },
        });
      }
      return tx.booking.update({
        where: { id: params.itemId },
        data: {
          paidAmount: { increment },
          ...(paymentMode !== undefined && { paymentMode }),
        },
      });
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
