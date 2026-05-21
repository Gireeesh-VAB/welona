import { db } from '@/lib/db';
import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { requireAuth, requirePermission } from '@/lib/auth/service';

type Pmt = { amount: number; method: string };

/** Group payments by method into sorted line items plus a total. */
function byMethod(payments: Pmt[]) {
  const map: Record<string, number> = {};
  for (const p of payments) map[p.method] = (map[p.method] ?? 0) + p.amount;
  const items = Object.entries(map)
    .map(([method, amount]) => ({ method, amount }))
    .sort((a, b) => b.amount - a.amount);
  return { items, total: items.reduce((s, i) => s + i.amount, 0) };
}

/**
 * GET /api/v1/dashboard — operations overview: today's enquiries, walk-ins,
 * collections (today and this month), per-employee collection and the
 * follow-ups due today.
 */
export const GET = route(async (req) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'dashboard:read');
  const orgId = claims.orgId;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [todayEnquiries, monthLeads, monthPayments, todayWalkIns, dueFollowups, staff, treatments] =
    await Promise.all([
      db.lead.count({ where: { orgId, createdAt: { gte: startOfToday } } }),
      db.lead.findMany({
        where: { orgId, createdAt: { gte: startOfMonth } },
        select: { treatmentId: true },
      }),
      db.payment.findMany({
        where: { orgId, receivedAt: { gte: startOfMonth } },
        select: { amount: true, method: true, receivedAt: true, recordedById: true },
      }),
      db.booking.count({
        where: { orgId, scheduledAt: { gte: startOfToday, lt: startOfTomorrow } },
      }),
      db.followUp.findMany({
        where: { orgId, status: 'pending', dueAt: { gte: startOfToday, lt: startOfTomorrow } },
        include: { lead: { select: { contactName: true } } },
        orderBy: { dueAt: 'asc' },
      }),
      db.staff.findMany({ where: { orgId }, select: { id: true, name: true } }),
      db.treatment.findMany({ where: { orgId }, select: { id: true, name: true } }),
    ]);

  const staffName = new Map(staff.map((s) => [s.id, s.name]));
  const todayPayments = monthPayments.filter((p) => p.receivedAt >= startOfToday);

  // Enquiries this month grouped by the treatment they asked about.
  const treatmentName = new Map(treatments.map((t) => [t.id, t.name]));
  const treatmentTally: Record<string, number> = {};
  for (const l of monthLeads) {
    const key = l.treatmentId ?? '__none__';
    treatmentTally[key] = (treatmentTally[key] ?? 0) + 1;
  }
  const treatmentBreakdown = Object.entries(treatmentTally)
    .map(([key, enquiries]) => ({
      treatmentId: key === '__none__' ? null : key,
      name: key === '__none__' ? 'Not specified' : treatmentName.get(key) ?? 'Other',
      enquiries,
    }))
    .sort((a, b) => b.enquiries - a.enquiries);

  // Per-employee collection for today, keyed on who recorded each payment.
  const empMap: Record<string, number> = {};
  for (const p of todayPayments) {
    const key = p.recordedById ?? 'unassigned';
    empMap[key] = (empMap[key] ?? 0) + p.amount;
  }
  const employeeCollection = Object.entries(empMap)
    .map(([staffId, amount]) => ({
      staffId,
      name: staffName.get(staffId) ?? 'Unassigned',
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);

  return ok({
    kpis: {
      todayEnquiries,
      todayWalkIns,
      monthCollection: monthPayments.reduce((s, p) => s + p.amount, 0),
      todayFollowupsDue: dueFollowups.length,
    },
    todayCollection: byMethod(todayPayments),
    monthCollection: { ...byMethod(monthPayments), fromDate: startOfMonth.toISOString() },
    treatmentBreakdown,
    employeeCollection,
    followupsDue: dueFollowups.map((f) => ({
      id: f.id,
      contactName: f.lead?.contactName ?? '—',
      note: f.note,
      dueAt: f.dueAt ? f.dueAt.toISOString() : null,
      assignedTo: f.assignedToId ? staffName.get(f.assignedToId) ?? null : null,
    })),
  });
});
