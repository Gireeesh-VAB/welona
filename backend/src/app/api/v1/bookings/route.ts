import { z } from 'zod';
import { db } from '@/lib/db';
import { route, parseQuery, parseBody } from '@/lib/api/handler';
import { ok, created } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { nextDocumentNumber } from '@/lib/sales/service';
import { appointmentCreateSchema } from '@shared/schemas/customer-modules';

const monthQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Use YYYY-MM')
    .optional(),
});

/** Resolve the [start, end) range for a YYYY-MM string, defaulting to this month. */
function monthRange(month?: string): { start: Date; end: Date } {
  const now = new Date();
  let year = now.getFullYear();
  let monthIdx = now.getMonth();
  if (month) {
    const [y, m] = month.split('-').map(Number);
    year = y;
    monthIdx = m - 1;
  }
  return { start: new Date(year, monthIdx, 1), end: new Date(year, monthIdx + 1, 1) };
}

/**
 * GET /api/v1/bookings — service appointments for the org in a given month,
 * for the appointments calendar.
 */
export const GET = route(async (req) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'bookings:read');
  const { month } = parseQuery(req, monthQuerySchema);
  const { start, end } = monthRange(month);

  const staffBranchId = claims.branchIds[0] ?? null;
  const bookings = await db.booking.findMany({
    where: { orgId: claims.orgId, scheduledAt: { gte: start, lt: end }, ...(staffBranchId ? { branchId: staffBranchId } : {}) },
    include: {
      customer: { select: { id: true, name: true } },
      items: { orderBy: { sortOrder: 'asc' }, take: 1 },
    },
    orderBy: { scheduledAt: 'asc' },
  });

  return ok(
    bookings.map((b) => ({
      id: b.id,
      customerId: b.customerId,
      customerName: b.customer?.name ?? '—',
      serviceName: b.serviceName,
      categoryName: b.items[0]?.category ?? null,
      scheduledAt: b.scheduledAt.toISOString(),
      status: b.status,
      netAmount: b.netAmount,
      notes: b.notes,
    })),
  );
});

/** POST /api/v1/bookings — book a service appointment with line items. */
export const POST = route(async (req) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'bookings:create');
  const body = await parseBody(req, appointmentCreateSchema);

  const customer = await db.customer.findFirst({
    where: { id: body.customerId, orgId: claims.orgId },
  });
  if (!customer) throw Errors.notFound('Customer');

  const items = body.items.map((it, i) => ({
    category: it.category || null,
    service: it.service,
    quantity: it.quantity,
    amount: it.amount,
    lineTotal: it.amount * it.quantity,
    sortOrder: i,
  }));
  const totalAmount = items.reduce((s, it) => s + it.lineTotal, 0);
  const netAmount = totalAmount - body.discount + body.roundOff;
  const serviceName =
    items.length === 1 ? items[0].service : `${items[0].service} +${items.length - 1} more`;

  const booking = await db.$transaction(async (tx) => {
    const number = await nextDocumentNumber(tx, claims.orgId, 'booking', 'BKG');
    return tx.booking.create({
      data: {
        orgId: claims.orgId,
        customerId: customer.id,
        branchId: body.branchId ?? customer.branchId,
        number,
        consultantStaffId: body.consultantStaffId ?? null,
        serviceName,
        scheduledAt: new Date(body.scheduledAt),
        status: body.status ?? 'scheduled',
        totalAmount,
        discount: body.discount,
        roundOff: body.roundOff,
        netAmount,
        notes: body.notes || null,
        createdById: claims.sub,
        items: { create: items },
      },
    });
  });

  return created({ id: booking.id, number: booking.number });
});
