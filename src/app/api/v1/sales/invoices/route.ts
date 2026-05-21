import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { invoiceCreateSchema, listQuerySchema } from '@/lib/sales/schemas';
import { computeTotals, nextDocumentNumber } from '@/lib/sales/service';
import { invoiceDetailInclude } from '@/lib/sales/includes';

const listInclude = {
  customer: { select: { id: true, name: true } },
  order: { select: { id: true, number: true } },
} satisfies Prisma.InvoiceInclude;

/**
 * GET  /api/v1/sales/invoices — paginated invoice list.
 * POST /api/v1/sales/invoices — raise an invoice, from an order or line items.
 */
export const GET = route(async (req) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'sales:read');
  const query = parseQuery(req, listQuerySchema);

  const where: Prisma.InvoiceWhereInput = { orgId: claims.orgId };
  if (query.status) where.status = query.status;
  if (query.branchId) where.branchId = query.branchId;
  if (query.search) {
    where.OR = [
      { number: { contains: query.search } },
      { customer: { name: { contains: query.search } } },
    ];
  }

  const [rows, total] = await Promise.all([
    db.invoice.findMany({
      where,
      include: listInclude,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    db.invoice.count({ where }),
  ]);

  return ok(rows, buildMeta(query.page, query.limit, total));
});

export const POST = route(async (req) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'sales:create');
  const body = await parseBody(req, invoiceCreateSchema);

  const customer = await db.customer.findFirst({
    where: { id: body.customerId, orgId: claims.orgId },
  });
  if (!customer) throw Errors.badRequest('Selected customer does not exist');

  // Totals come from explicit line items, or are copied from the linked order.
  let subtotal: number;
  let taxAmt: number;
  let total: number;

  if (body.items && body.items.length > 0) {
    const totals = computeTotals(body.items);
    subtotal = totals.subtotal;
    taxAmt = totals.taxAmt;
    total = totals.total;
  } else if (body.orderId) {
    const order = await db.salesOrder.findFirst({
      where: { id: body.orderId, orgId: claims.orgId },
    });
    if (!order) throw Errors.badRequest('Selected order does not exist');
    subtotal = order.subtotal;
    taxAmt = order.taxAmt;
    total = order.total;
  } else {
    throw Errors.badRequest('Provide an order or line items to invoice');
  }

  const invoice = await db.$transaction(async (tx) => {
    const number = await nextDocumentNumber(tx, claims.orgId, 'invoice', 'INV');
    return tx.invoice.create({
      data: {
        orgId: claims.orgId,
        branchId: body.branchId ?? customer.branchId,
        number,
        customerId: body.customerId,
        orderId: body.orderId ?? null,
        status: 'draft',
        dueAt: body.dueAt ? new Date(body.dueAt) : null,
        notes: body.notes || null,
        subtotal,
        taxAmt,
        total,
        amountPaid: 0,
      },
      include: invoiceDetailInclude,
    });
  });

  return created(invoice);
});
