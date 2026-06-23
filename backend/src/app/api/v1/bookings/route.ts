import { z } from 'zod';
import { db } from '@/lib/db';
import { route, parseQuery, parseBody } from '@/lib/api/handler';
import { ok, created } from '@/lib/api/response';
import { Errors, ApiError } from '@/lib/api/errors';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { nextDocumentNumber } from '@/lib/sales/service';
import { appointmentCreateSchema } from '@shared/schemas/customer-modules';
import { calculateGst } from '@/lib/gst';
import { checkServiceSessionStock, applyServiceSessionStock } from '@/lib/service-inventory';

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

  // Expand package items into a summary line + per-service sub-items for revenue tracking.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dba = db as any;
  const pkgMasterIds = body.items
    .map(it => it.packageSessionMasterId)
    .filter((id): id is string => !!id);
  const pkgMasterMap = new Map<string, { serviceSnapshotsJson: string }>();
  if (pkgMasterIds.length) {
    const masters = await dba.packageSessionMaster.findMany({
      where: { id: { in: pkgMasterIds } },
      select: { id: true, serviceSnapshotsJson: true },
    });
    for (const m of masters) pkgMasterMap.set(m.id, m);
  }

  // Build allocation lookup: serviceName → amountPaise (from frontend allocation choice)
  const allocationMap = new Map<string, number>();
  for (const a of body.packageServiceAllocations ?? []) allocationMap.set(a.serviceName, a.amountPaise);

  const items: Array<{
    category: string | null; service: string; quantity: number; amount: number;
    lineTotal: number; sortOrder: number; isSessionBased: boolean;
    packageSessionMasterId: string | null; isPackageSummaryLine: boolean;
  }> = [];
  let sortIdx = 0;

  for (const it of body.items) {
    const masterId = it.packageSessionMasterId ?? null;
    const master = masterId ? pkgMasterMap.get(masterId) : null;

    if (master) {
      // Summary line (shown on receipt, excluded from revenue aggregation)
      items.push({
        category: it.category || null, service: it.service,
        quantity: it.quantity, amount: it.amount,
        lineTotal: it.amount * it.quantity,
        sortOrder: sortIdx++, isSessionBased: it.isSessionBased ?? false,
        packageSessionMasterId: masterId, isPackageSummaryLine: true,
      });

      // Per-service sub-items
      type Snapshot = { serviceId?: string; serviceName: string; maxPrice: number; customPricePerSession?: number; sessions: number; customSessions?: number };
      let snapshots: Snapshot[] = [];
      try { snapshots = JSON.parse(master.serviceSnapshotsJson ?? '[]'); } catch { snapshots = []; }

      if (snapshots.length > 0) {
        const pkgLinePaise = it.amount * it.quantity; // already in paise
        // Compute raw prices, then normalize so they sum to pkgLinePaise
        const rawPrices = snapshots.map(s => {
          const unitPrice = s.customPricePerSession ?? s.maxPrice;
          const qty = s.customSessions ?? s.sessions ?? 1;
          return unitPrice * qty;
        });
        const rawTotal = rawPrices.reduce((a, b) => a + b, 0);
        const normalized = rawPrices.map((rp, i) =>
          rawTotal > 0 ? Math.round(pkgLinePaise * (rp / rawTotal)) : Math.round(pkgLinePaise / snapshots.length)
        );
        // Fix rounding residual on last item
        const normSum = normalized.reduce((a, b) => a + b, 0);
        if (normalized.length > 0) normalized[normalized.length - 1] += pkgLinePaise - normSum;

        for (let i = 0; i < snapshots.length; i++) {
          const snap = snapshots[i];
          const qty = snap.customSessions ?? snap.sessions ?? 1;
          const lineTotal = normalized[i];
          const unitAmt = qty > 0 ? Math.round(lineTotal / qty) : lineTotal;
          // paidAmount: use explicit allocation if provided, else 0
          const paidAmt = allocationMap.get(snap.serviceName) ?? 0;
          items.push({
            category: 'Packages', service: snap.serviceName,
            quantity: qty, amount: unitAmt,
            lineTotal,
            sortOrder: sortIdx++, isSessionBased: true,
            packageSessionMasterId: masterId, isPackageSummaryLine: false,
          });
          // Store paidAmount alongside — handled after booking creation via allocation
          allocationMap.set(snap.serviceName + '__itemIdx__' + (items.length - 1), paidAmt);
        }
      }
    } else {
      items.push({
        category: it.category || null, service: it.service,
        quantity: it.quantity, amount: it.amount,
        lineTotal: it.amount * it.quantity,
        sortOrder: sortIdx++, isSessionBased: it.isSessionBased ?? false,
        packageSessionMasterId: masterId, isPackageSummaryLine: false,
      });
    }
  }

  const totalAmount = items
    .filter(it => !it.isPackageSummaryLine)
    .reduce((s, it) => s + it.lineTotal, 0);
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

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    // Skip summary lines — their price is already covered by the per-service sub-items
    if (item.isPackageSummaryLine) continue;
    // Skip package sub-items — the package price is all-inclusive; no additional tax should be applied
    if (item.packageSessionMasterId) continue;
    // Use per-item tax from the request (set for package items); otherwise look up from service table.
    // Map back to original body item index (summary lines are inserted so indices diverge)
    const bodyItem = body.items.find(bi => bi.service === item.service && bi.packageSessionMasterId === item.packageSessionMasterId && !item.isPackageSummaryLine);
    const svc = serviceMap.get(item.service);
    const taxPct = bodyItem?.taxPercent ?? svc?.taxPercent ?? 0;
    const taxTyp = (bodyItem?.taxType ?? svc?.taxType ?? 'exclusive') as 'inclusive' | 'exclusive';
    if (!taxPct) continue;
    const linePaise = item.lineTotal;
    const gst = calculateGst({
      netAmountPaise: linePaise,
      percentage: taxPct,
      taxType: taxTyp,
      branchStateId: branchData?.stateId ?? null,
      customerStateId: customerData?.stateId ?? null,
    });
    aggregateTaxable += gst.taxableAmt;
    aggregateTax += gst.totalTax;
    aggregateCgst += gst.cgstAmt;
    aggregateSgst += gst.sgstAmt;
    aggregateIgst += gst.igstAmt;
    if (taxTyp === 'exclusive') extraAmount += gst.totalTax;
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

  const effectiveBranchId = body.branchId ?? customer.branchId ?? null;
  const isCompleted = (body.status ?? 'scheduled') === 'completed';

  // Stock check — runs before the write transaction so we can warn the user.
  if (isCompleted && effectiveBranchId && !body.forceCreate) {
    const serviceLines = items.map((it) => ({ serviceName: it.service, sessionCount: it.quantity }));
    const shortfalls = await db.$transaction((tx) =>
      checkServiceSessionStock(tx, { branchId: effectiveBranchId, orgId: claims.orgId, lines: serviceLines }),
    );
    if (shortfalls.length > 0) {
      // Encode each shortfall as a details entry (JSON string per entry) so the frontend can parse them.
      const details = shortfalls.map((s) => ({
        field: 'shortfall',
        message: JSON.stringify(s),
      }));
      throw new ApiError(
        'STOCK_INSUFFICIENT',
        'Insufficient stock for one or more products. Proceed anyway or raise an indent.',
        409,
        details,
      );
    }
  }

  const booking = await db.$transaction(async (tx) => {
    const number = await nextDocumentNumber(tx, claims.orgId, 'booking', 'BKG');
    const created = await tx.booking.create({
      data: {
        orgId: claims.orgId,
        customerId: customer.id,
        branchId: effectiveBranchId,
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

    // Auto-deduct inventory for completed bookings.
    if (isCompleted && effectiveBranchId) {
      const serviceLines = items.map((it) => ({ serviceName: it.service, sessionCount: it.quantity }));
      await applyServiceSessionStock(tx, {
        branchId: effectiveBranchId,
        orgId: claims.orgId,
        bookingRef: created.number ?? created.id,
        lines: serviceLines,
        force: body.forceCreate,
      });
    }

    return created;
  });

  // Fetch the created items so the frontend can map service names → BookingItem IDs for allocation
  const createdItems = await db.bookingItem.findMany({
    where: { bookingId: booking.id },
    select: { id: true, service: true, isPackageSummaryLine: true, packageSessionMasterId: true, lineTotal: true },
    orderBy: { sortOrder: 'asc' },
  });

  return created({ id: booking.id, number: booking.number, items: createdItems });
});
