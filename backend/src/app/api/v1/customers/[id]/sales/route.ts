import { db } from '@/lib/db';
import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth, requirePermission } from '@/lib/auth/service';

type Ctx = { params: { id: string } };

/**
 * GET /api/v1/customers/[id]/sales — the customer's 360° sales history:
 * every lead, quotation, order and invoice, plus a roll-up summary.
 */
export const GET = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'customers:read');

  const customer = await db.customer.findFirst({
    where: { id: params.id, orgId: claims.orgId },
  });
  if (!customer) throw Errors.notFound('Customer');

  const [leads, quotations, orders, invoices] = await Promise.all([
    db.lead.findMany({ where: { customerId: params.id }, orderBy: { createdAt: 'desc' } }),
    db.quotation.findMany({ where: { customerId: params.id }, orderBy: { createdAt: 'desc' } }),
    db.salesOrder.findMany({ where: { customerId: params.id }, orderBy: { createdAt: 'desc' } }),
    db.invoice.findMany({
      where: { customerId: params.id },
      orderBy: { createdAt: 'desc' },
      include: {
        payments: { orderBy: { receivedAt: 'desc' } },
        order: {
          select: {
            id: true,
            number: true,
            items: {
              select: { id: true, description: true, quantity: true, unitPrice: true,
                         discountAmt: true, taxRate: true, lineTotal: true, sortOrder: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    }),
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
