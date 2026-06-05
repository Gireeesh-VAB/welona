import { db } from '@/lib/db';
import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { requireAuth, requirePermission } from '@/lib/auth/service';

/**
 * GET /api/v1/pending-payments — every issued invoice that still has an
 * outstanding balance, oldest due date first, with a roll-up summary.
 */
export const GET = route(async (req) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'sales:read');

  const staffBranchId = claims.branchIds[0] ?? null;
  const invoices = await db.invoice.findMany({
    where: { orgId: claims.orgId, status: { in: ['issued', 'partially_paid'] }, ...(staffBranchId ? { branchId: staffBranchId } : {}) },
    include: { customer: { select: { id: true, name: true } } },
    orderBy: { dueAt: 'asc' },
  });

  const pending = invoices
    .filter((i) => i.total > i.amountPaid)
    .map((i) => ({
      id: i.id,
      number: i.number,
      customerId: i.customerId,
      customerName: i.customer?.name ?? '—',
      total: i.total,
      amountPaid: i.amountPaid,
      outstanding: i.total - i.amountPaid,
      dueAt: i.dueAt ? i.dueAt.toISOString() : null,
      status: i.status,
    }));

  return ok({
    invoices: pending,
    summary: {
      count: pending.length,
      totalOutstanding: pending.reduce((s, p) => s + p.outstanding, 0),
    },
  });
});
