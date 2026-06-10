import { z } from 'zod';
import { db } from '@/lib/db';
import { route, parseQuery, parseBody } from '@/lib/api/handler';
import { ok, created } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { nextDocumentNumber } from '@/lib/sales/service';
import { appointmentCreateSchema } from '@shared/schemas/customer-modules';
import { calculateGst } from '@/lib/gst';

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
  let netAmount = totalAmount - body.discount + body.roundOff;
  const serviceName =
    items.length === 1 ? items[0].service : `${items[0].service} +${items.length - 1} more`;

  // Auto-calculate GST from each service's taxPercent / taxType configuration.
  // Look up branch + customer states once so CGST/SGST vs IGST can be determined.
  const branchId = body.branchId ?? customer.branchId;
  const [branchData, customerData] = await Promise.all([
    branchId ? db.branch.findUnique({ where: { id: branchId }, select: { stateId: true } }) : null,
    db.customer.findUnique({ where: { id: customer.id }, select: { stateId: true } }),
  ]);

  let aggregateTaxable = 0;
  let aggregateTax = 0;
  let aggregateCgst = 0;
  let aggregateSgst = 0;
  let aggregateIgst = 0;
  let extraAmount = 0; // exclusive tax added on top of netAmount

  // Fetch all services that appear in the booking items (by name, org-scoped).
  const serviceNames = [...new Set(items.map((it) => it.service))];
  const serviceRows = await db.service.findMany({
    where: { name: { in: serviceNames }, isActive: true },
    select: { name: true, taxPercent: true, taxType: true },
  });
  const serviceMap = new Map(serviceRows.map((s) => [s.name, s]));

  for (const item of items) {
    const svc = serviceMap.get(item.service);
    if (!svc || !svc.taxPercent) continue;
    const linePaise = item.lineTotal;
    const gst = calculateGst({
      netAmountPaise: linePaise,
      percentage: svc.taxPercent,
      taxType: svc.taxType as 'inclusive' | 'exclusive',
      branchStateId: branchData?.stateId ?? null,
      customerStateId: customerData?.stateId ?? null,
    });
    aggregateTaxable += gst.taxableAmt;
    aggregateTax += gst.totalTax;
    aggregateCgst += gst.cgstAmt;
    aggregateSgst += gst.sgstAmt;
    aggregateIgst += gst.igstAmt;
    if (svc.taxType === 'exclusive') extraAmount += gst.totalTax;
  }

  const isIntraState = !!(branchData?.stateId && customerData?.stateId && branchData.stateId === customerData.stateId);

  const gstData: Record<string, unknown> = aggregateTax > 0
    ? {
        taxableAmt: aggregateTaxable,
        cgstPct: isIntraState ? 50 : 0,   // 50 = 0.5 in basis points representation — half of full rate
        cgstAmt: aggregateCgst,
        sgstPct: isIntraState ? 50 : 0,
        sgstAmt: aggregateSgst,
        igstPct: isIntraState ? 0 : 100,
        igstAmt: aggregateIgst,
        taxType: isIntraState ? 'cgst_sgst' : 'igst',
      }
    : {};

  netAmount += extraAmount;

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
        ...gstData,
      },
    });
  });

  return created({ id: booking.id, number: booking.number });
});
