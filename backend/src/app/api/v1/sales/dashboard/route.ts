import { db } from '@/lib/db';
import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { requireAuth, requirePermission } from '@/lib/auth/service';

/** Count occurrences of each string value. */
function tally(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((acc, v) => {
    acc[v] = (acc[v] ?? 0) + 1;
    return acc;
  }, {});
}

/**
 * GET /api/v1/sales/dashboard — sales pipeline overview: KPI roll-ups,
 * per-stage counts, a 6-month revenue series, a salesperson leaderboard,
 * plus today's enquiries and the follow-ups due today.
 */
export const GET = route(async (req) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'sales:read');
  const orgId = claims.orgId;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const [leads, quotations, orders, payments, invoices, staff, todayLeads, dueFollowups] =
    await Promise.all([
      db.lead.findMany({ where: { orgId }, select: { status: true, ownerStaffId: true } }),
      db.quotation.findMany({
        where: { orgId },
        select: { status: true, ownerStaffId: true, total: true },
      }),
      db.salesOrder.findMany({
        where: { orgId },
        select: { status: true, ownerStaffId: true, total: true },
      }),
      db.payment.findMany({ where: { orgId }, select: { amount: true, receivedAt: true } }),
      db.invoice.findMany({
        where: { orgId, status: { not: 'void' } },
        select: { total: true, amountPaid: true },
      }),
      db.staff.findMany({ where: { orgId }, select: { id: true, name: true } }),
      db.lead.findMany({
        where: { orgId, createdAt: { gte: startOfToday } },
        include: { treatment: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      db.followUp.findMany({
        where: { orgId, status: 'pending', dueAt: { gte: startOfToday, lt: startOfTomorrow } },
        include: { lead: { select: { id: true, contactName: true, status: true } } },
        orderBy: { dueAt: 'asc' },
        take: 100,
      }),
    ]);

  const staffName = new Map(staff.map((s) => [s.id, s.name]));

  // --- KPIs ---
  const wonRevenue = payments.reduce((s, p) => s + p.amount, 0);
  const totalBilled = invoices.reduce((s, i) => s + i.total, 0);
  const totalPaid = invoices.reduce((s, i) => s + i.amountPaid, 0);
  const convertedLeads = leads.filter((l) => l.status === 'converted').length;
  const activeLeads = leads.filter(
    (l) => !['converted', 'lost', 'unqualified'].includes(l.status),
  ).length;

  const kpis = {
    totalLeads: leads.length,
    activeLeads,
    openQuotations: quotations.filter((q) => q.status === 'draft' || q.status === 'sent').length,
    totalOrders: orders.length,
    wonRevenue,
    outstanding: totalBilled - totalPaid,
    pipelineValue: quotations
      .filter((q) => q.status === 'sent')
      .reduce((s, q) => s + q.total, 0),
    conversionRate: leads.length ? Math.round((convertedLeads / leads.length) * 100) : 0,
  };

  // --- 6-month revenue series ---
  const months = Array.from({ length: 6 }, (_, idx) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
    return {
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleString('en-US', { month: 'short' }),
      amount: 0,
    };
  });
  const monthMap = new Map(months.map((m) => [m.key, m]));
  for (const p of payments) {
    const d = new Date(p.receivedAt);
    const bucket = monthMap.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (bucket) bucket.amount += p.amount;
  }

  // --- Salesperson leaderboard ---
  const leadsByStaff = tally(leads.map((l) => l.ownerStaffId));
  const quotesByStaff = tally(quotations.map((q) => q.ownerStaffId));
  const orderAgg = orders.reduce<Record<string, { count: number; value: number }>>((acc, o) => {
    const a = (acc[o.ownerStaffId] ??= { count: 0, value: 0 });
    a.count += 1;
    if (o.status !== 'cancelled') a.value += o.total;
    return acc;
  }, {});

  const salespeople = staff
    .map((s) => ({
      staffId: s.id,
      name: s.name,
      leads: leadsByStaff[s.id] ?? 0,
      quotations: quotesByStaff[s.id] ?? 0,
      orders: orderAgg[s.id]?.count ?? 0,
      orderValue: orderAgg[s.id]?.value ?? 0,
    }))
    .filter((s) => s.leads || s.quotations || s.orders)
    .sort((a, b) => b.orderValue - a.orderValue);

  return ok({
    kpis,
    pipeline: {
      leads: tally(leads.map((l) => l.status)),
      quotations: tally(quotations.map((q) => q.status)),
      orders: tally(orders.map((o) => o.status)),
    },
    revenueByMonth: months.map((m) => ({ month: m.label, amount: m.amount })),
    salespeople,
    today: {
      enquiries: todayLeads.length,
      followupsDue: dueFollowups.length,
    },
    todayEnquiries: todayLeads.map((l) => ({
      id: l.id,
      contactName: l.contactName,
      contactPhone: l.contactPhone,
      status: l.status,
      enquiryType: l.enquiryType,
      treatmentName: l.treatment?.name ?? null,
      createdAt: l.createdAt.toISOString(),
    })),
    followupsDueToday: dueFollowups.map((f) => ({
      id: f.id,
      leadId: f.leadId,
      contactName: f.lead?.contactName ?? '—',
      leadStatus: f.lead?.status ?? null,
      note: f.note,
      contactedAt: f.contactedAt ? f.contactedAt.toISOString() : null,
      dueAt: f.dueAt ? f.dueAt.toISOString() : null,
      status: f.status,
      outcome: f.outcome,
      assignedToName: f.assignedToId ? staffName.get(f.assignedToId) ?? null : null,
    })),
  });
});
