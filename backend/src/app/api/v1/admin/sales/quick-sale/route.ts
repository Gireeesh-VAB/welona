import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { created } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { resolveOrgId } from '@/lib/org';
import { quickSaleSchema } from '@shared/schemas/sales';
import { computeTotals, nextDocumentNumber } from '@/lib/sales/service';
import { orderDetailInclude } from '@/lib/sales/includes';
import { serializeDelivery } from '@/lib/sales/serializers';
import { applyDeliverySaleStock } from '@/lib/sales/inventory';

/**
 * POST /api/v1/admin/sales/quick-sale — the unified "New Sale".
 *
 * Creates a confirmed sales order in one step and, unless opted out, raises
 * an issued invoice for it — all in a single transaction.
 */
export const POST = route(async (req) => {
  requireAdminAuth(req);
  const orgId = await resolveOrgId();
  const body = await parseBody(req, quickSaleSchema);

  // Admin/branch sessions have no staff identity, so a salesperson must be
  // chosen explicitly (the employee panel defaults it to the logged-in staff).
  const ownerStaffId = body.ownerStaffId;
  if (!ownerStaffId) throw Errors.badRequest('Select a salesperson');

  const owner = await db.staff.findFirst({ where: { id: ownerStaffId, orgId } });
  if (!owner) throw Errors.badRequest('Selected salesperson does not exist');

  // Find existing customer by name or auto-create a walk-in record.
  let customer = await db.customer.findFirst({
    where: { orgId, name: body.customerName },
  });
  if (!customer) {
    customer = await db.customer.create({
      data: {
        orgId,
        branchId: body.branchId ?? owner.branchId ?? null,
        name: body.customerName,
      },
    });
  }

  const totals = computeTotals(body.items);
  const branchId = body.branchId ?? customer.branchId;

  const result = await db.$transaction(async (tx) => {
    const orderNumber = await nextDocumentNumber(tx, orgId, 'order', 'SO');
    const order = await tx.salesOrder.create({
      data: {
        orgId,
        branchId,
        number: orderNumber,
        customerId: customer.id,
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
          customerId: customer.id,
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

    // Deduct inventory for product lines immediately — quick-sale is point-of-sale.
    const stockLines = order.items.map((item) => ({ orderItemId: item.id, quantity: item.quantity }));
    await applyDeliverySaleStock(tx, { branchId, lines: stockLines, ref: orderNumber });

    return { order, invoice };
  });

  return created({
    order: { ...result.order, deliveries: result.order.deliveries.map(serializeDelivery) },
    invoice: result.invoice,
  });
});
