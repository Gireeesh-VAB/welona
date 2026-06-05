import { db } from '@/lib/db';
import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { resolveOrgId } from '@/lib/org';

type Ctx = { params: { id: string } };

/**
 * GET /api/v1/admin/customers/[id]/sales — the customer's 360° sales history:
 * every lead, quotation, order and invoice, plus a roll-up summary.
 */
export const GET = route<Ctx>(async (req, { params }) => {
  requireAdminAuth(req);
  const orgId = await resolveOrgId();

  const customer = await db.customer.findFirst({
    where: { id: params.id, orgId },
  });
  if (!customer) throw Errors.notFound('Customer');

  const [leads, quotations, orders, invoices] = await Promise.all([
    db.lead.findMany({ where: { customerId: params.id }, orderBy: { createdAt: 'desc' } }),
    db.quotation.findMany({ where: { customerId: params.id }, orderBy: { createdAt: 'desc' } }),
    db.salesOrder.findMany({ where: { customerId: params.id }, orderBy: { createdAt: 'desc' } }),
    db.invoice.findMany({ where: { customerId: params.id }, orderBy: { createdAt: 'desc' } }),
  ]);

  const totalSpent = invoices.reduce((sum, i) => sum + i.amountPaid, 0);
  const totalBilled = invoices
    .filter((i) => i.status !== 'void')
    .reduce((sum, i) => sum + i.total, 0);

  return ok({
    leads,
    quotations,
    orders,
    invoices,
    summary: {
      leadCount: leads.length,
      quotationCount: quotations.length,
      orderCount: orders.length,
      invoiceCount: invoices.length,
      totalBilled,
      totalSpent,
      outstanding: totalBilled - totalSpent,
    },
  });
});
