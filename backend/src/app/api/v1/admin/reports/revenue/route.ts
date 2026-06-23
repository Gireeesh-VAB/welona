import { db } from '@/lib/db';
import { route, parseQuery } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { requireAdminAuth } from '@/lib/auth/service';
import { z } from 'zod';

const querySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  branchId: z.string().optional(),
});

/**
 * GET /api/v1/admin/reports/revenue?from=&to=&branchId=
 *
 * Returns doctor-wise and service-wise revenue + payment collections.
 * All money values in paise (minor units).
 * - totalRevenue  = sum of netAmount (amount billed)
 * - totalCollected = sum of paidAmount (cash actually received)
 * - outstanding   = totalRevenue - totalCollected
 */
export const GET = route(async (req) => {
  requireAdminAuth(req);

  const { from, to, branchId } = parseQuery(req, querySchema);

  const now = new Date();
  const fromDate = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
  const toDate = to ? new Date(to) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const where = {
    status: 'completed',
    scheduledAt: { gte: fromDate, lte: toDate },
    ...(branchId && { branchId }),
  };

  const bookings = await db.booking.findMany({
    where,
    select: {
      id: true,
      customerId: true,
      netAmount: true,
      paidAmount: true,
      consultantStaffId: true,
      items: {
        select: { service: true, category: true, lineTotal: true, quantity: true, isPackageSummaryLine: true, paidAmount: true },
      },
    },
  });

  // ---- Doctor-wise aggregation ------------------------------------------------
  const doctorMap = new Map<string, {
    totalRevenue: number;
    totalCollected: number;
    appointmentCount: number;
    customerIds: Set<string>;
  }>();

  for (const b of bookings) {
    const key = b.consultantStaffId ?? '__none__';
    if (!doctorMap.has(key)) {
      doctorMap.set(key, { totalRevenue: 0, totalCollected: 0, appointmentCount: 0, customerIds: new Set() });
    }
    const d = doctorMap.get(key)!;
    d.totalRevenue += b.netAmount;
    d.totalCollected += b.paidAmount;
    d.appointmentCount += 1;
    d.customerIds.add(b.customerId);
  }

  const employeeIds = [...doctorMap.keys()].filter((k) => k !== '__none__');
  const employees = employeeIds.length
    ? await db.employee.findMany({
        where: { id: { in: employeeIds } },
        select: { id: true, name: true, designation: true },
      })
    : [];
  const empById = new Map(employees.map((e) => [e.id, e]));

  const doctors = [...doctorMap.entries()]
    .filter(([key]) => key !== '__none__')
    .map(([id, agg]) => {
      const emp = empById.get(id);
      return {
        employeeId: id,
        name: emp?.name ?? 'Unknown',
        designation: emp?.designation ?? null,
        totalRevenue: agg.totalRevenue,
        totalCollected: agg.totalCollected,
        outstanding: agg.totalRevenue - agg.totalCollected,
        appointmentCount: agg.appointmentCount,
        uniqueCustomers: agg.customerIds.size,
        avgRevenuePerAppointment: agg.appointmentCount > 0
          ? Math.round(agg.totalRevenue / agg.appointmentCount)
          : 0,
      };
    })
    .sort((a, b) => b.totalCollected - a.totalCollected);

  // ---- Service-wise aggregation -----------------------------------------------
  // Payment is at booking level. Distribute paidAmount proportionally
  // across services based on each service's share of netAmount.
  const serviceMap = new Map<string, {
    category: string | null;
    totalRevenue: number;
    totalCollected: number;
    bookingCount: number;
    totalQty: number;
    bookingIds: Set<string>;
  }>();

  for (const b of bookings) {
    const bookingNet = b.netAmount;
    const nonSummaryItems = b.items.filter((it) => !it.isPackageSummaryLine);
    for (const it of nonSummaryItems) {
      const key = it.service;
      if (!serviceMap.has(key)) {
        serviceMap.set(key, {
          category: it.category ?? null,
          totalRevenue: 0,
          totalCollected: 0,
          bookingCount: 0,
          totalQty: 0,
          bookingIds: new Set(),
        });
      }
      const s = serviceMap.get(key)!;
      s.totalRevenue += it.lineTotal;
      // Use explicit per-item paidAmount (set for new package sub-items); fall back to proportional share.
      const collected = it.paidAmount > 0
        ? it.paidAmount
        : Math.round(b.paidAmount * (bookingNet > 0 ? it.lineTotal / bookingNet : 1 / Math.max(1, nonSummaryItems.length)));
      s.totalCollected += collected;
      s.totalQty += it.quantity;
      if (!s.bookingIds.has(b.id)) {
        s.bookingIds.add(b.id);
        s.bookingCount += 1;
      }
    }
  }

  const services = [...serviceMap.entries()]
    .map(([name, agg]) => ({
      serviceName: name,
      category: agg.category,
      totalRevenue: agg.totalRevenue,
      totalCollected: agg.totalCollected,
      outstanding: agg.totalRevenue - agg.totalCollected,
      bookingCount: agg.bookingCount,
      totalQty: agg.totalQty,
      avgRevenuePerBooking: agg.bookingCount > 0
        ? Math.round(agg.totalRevenue / agg.bookingCount)
        : 0,
      avgCollectedPerBooking: agg.bookingCount > 0
        ? Math.round(agg.totalCollected / agg.bookingCount)
        : 0,
    }))
    .sort((a, b) => b.totalCollected - a.totalCollected);

  // ---- Summary ----------------------------------------------------------------
  const totalRevenue = bookings.reduce((s, b) => s + b.netAmount, 0);
  const totalCollected = bookings.reduce((s, b) => s + b.paidAmount, 0);
  const totalAppointments = bookings.length;
  const uniqueCustomers = new Set(bookings.map((b) => b.customerId)).size;

  return ok({
    summary: {
      totalRevenue,
      totalCollected,
      outstanding: totalRevenue - totalCollected,
      totalAppointments,
      uniqueCustomers,
    },
    doctors,
    services,
  });
});
