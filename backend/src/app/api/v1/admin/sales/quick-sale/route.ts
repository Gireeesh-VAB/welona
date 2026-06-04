import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { created } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminOrBranchAuth } from '@/lib/auth/service';
import { resolveOrgId } from '@/lib/org';
import { quickSaleSchema } from '@shared/schemas/sales';
import { computeTotals, nextDocumentNumber } from '@/lib/sales/service';
import { orderDetailInclude } from '@/lib/sales/includes';
import { serializeDelivery } from '@/lib/sales/serializers';

/**
 * POST /api/v1/admin/sales/quick-sale — the unified "New Sale".
 *
 * Creates a confirmed sales order in one step and, unless opted out, raises
 * an issued invoice for it — all in a single transaction.
 */
export const POST = route(async (req) => {
  const { branchScope } = requireAdminOrBranchAuth(req);
  const orgId = await resolveOrgId();
  const body = await parseBody(req, quickSaleSchema);

  // Admin/branch sessions have no staff identity, so a salesperson must be
  // chosen explicitly (the employee panel defaults it to the logged-in staff).
  const ownerStaffId = body.ownerStaffId;
  if (!ownerStaffId) throw Errors.badRequest('Select a salesperson');

  const [customer, owner] = await Promise.all([
    db.customer.findFirst({
      where: { id: body.customerId, orgId, ...(branchScope && { branchId: branchScope }) },
    }),
    // Branch sessions may only assign a salesperson from their own branch.
    db.staff.findFirst({
      where: { id: ownerStaffId, orgId, ...(branchScope && { branchId: branchScope }) },
    }),
  ]);
  if (!customer) throw Errors.badRequest('Selected customer does not exist');
  if (!owner) throw Errors.badRequest('Selected salesperson does not exist');

  const totals = computeTotals(body.items);
  // Branch sessions pin everything to their branch.
  const branchId = branchScope ?? body.branchId ?? customer.branchId;

  const result = await db.$transaction(async (tx) => {
    const orderNumber = await nextDocumentNumber(tx, orgId, 'order', 'SO');
    const order = await tx.salesOrder.create({
      data: {
        orgId,
        branchId,
        number: orderNumber,
        customerId: body.customerId,
        ownerStaffId,
        status: 'confirmed',
        paymentStatus: 'unpaid',
        notes: body.notes || null,
        subtotal: totals.subtotal,
        discountAmt: totals.discountAmt,
        taxAmt: totals.taxAmt,
        total: totals.total,
        items: { create: totals.lines },
      },
      include: orderDetailInclude,
    });

    let invoice = null;
    if (body.createInvoice) {
      const invoiceNumber = await nextDocumentNumber(tx, orgId, 'invoice', 'INV');
      invoice = await tx.invoice.create({
        data: {
          orgId,
          branchId,
          number: invoiceNumber,
          customerId: body.customerId,
          orderId: order.id,
          status: 'issued',
          issuedAt: new Date(),
          subtotal: totals.subtotal,
          taxAmt: totals.taxAmt,
          total: totals.total,
          amountPaid: 0,
        },
      });
    }

    return { order, invoice };
  });

  return created({
    order: { ...result.order, deliveries: result.order.deliveries.map(serializeDelivery) },
    invoice: result.invoice,
  });
});
