import { db } from '@/lib/db';
import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth, requirePermission } from '@/lib/auth/service';

type Ctx = { params: { id: string } };

/** GET /api/v1/bookings/[id] — full appointment detail, for the receipt. */
export const GET = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'bookings:read');

  const booking = await db.booking.findFirst({
    where: { id: params.id, orgId: claims.orgId },
    include: {
      items: { orderBy: { sortOrder: 'asc' } },
      customer: { select: { name: true, phone: true } },
    },
  });
  if (!booking) throw Errors.notFound('Appointment');

  let consultantName: string | null = null;
  if (booking.consultantStaffId) {
    const consultant = await db.staff.findUnique({
      where: { id: booking.consultantStaffId },
      select: { name: true },
    });
    consultantName = consultant?.name ?? null;
  }

  return ok({
    id: booking.id,
    number: booking.number,
    customerName: booking.customer?.name ?? '—',
    customerPhone: booking.customer?.phone ?? null,
    consultantName,
    serviceName: booking.serviceName,
    scheduledAt: booking.scheduledAt.toISOString(),
    status: booking.status,
    items: booking.items.map((it) => ({
      category: it.category,
      service: it.service,
      quantity: it.quantity,
      amount: it.amount,
      lineTotal: it.lineTotal,
    })),
    totalAmount: booking.totalAmount,
    discount: booking.discount,
    roundOff: booking.roundOff,
    netAmount: booking.netAmount,
    notes: booking.notes,
    createdAt: booking.createdAt.toISOString(),
  });
});
