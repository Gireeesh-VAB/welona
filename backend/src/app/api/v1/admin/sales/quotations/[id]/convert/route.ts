import { db } from '@/lib/db';
import { route } from '@/lib/api/handler';
import { created } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminOrBranchAuth } from '@/lib/auth/service';
import { resolveOrgId } from '@/lib/org';
import { QUOTATION_TRANSITIONS, assertTransition } from '@/lib/sales/transitions';
import { nextDocumentNumber } from '@/lib/sales/service';
import { orderDetailInclude } from '@/lib/sales/includes';

type Ctx = { params: { id: string } };

/**
 * POST /api/v1/admin/sales/quotations/[id]/convert — turn an approved quotation
 * into a sales order, copying its line items, and mark the quote converted.
 */
export const POST = route<Ctx>(async (req, { params }) => {
  const { branchScope } = requireAdminOrBranchAuth(req);
  const orgId = await resolveOrgId();

  const order = await db.$transaction(async (tx) => {
    const quotation = await tx.quotation.findFirst({
      where: { id: params.id, orgId, ...(branchScope && { branchId: branchScope }) },
      include: { items: { orderBy: { sortOrder: 'asc' } }, order: true },
    });
    if (!quotation) throw Errors.notFound('Quotation');
    if (quotation.order) {
      throw Errors.conflict(`This quotation is already linked to order ${quotation.order.number}`);
    }
    assertTransition(QUOTATION_TRANSITIONS, quotation.status, 'converted', 'quotation');

    const number = await nextDocumentNumber(tx, orgId, 'order', 'SO');
    const newOrder = await tx.salesOrder.create({
      data: {
        orgId,
        branchId: branchScope ?? quotation.branchId,
        number,
        customerId: quotation.customerId,
        quotationId: quotation.id,
        ownerStaffId: quotation.ownerStaffId,
        status: 'pending',
        paymentStatus: 'unpaid',
        subtotal: quotation.subtotal,
        discountAmt: quotation.discountAmt,
        taxAmt: quotation.taxAmt,
        total: quotation.total,
        items: {
          create: quotation.items.map((it) => ({
            productId: it.productId,
            description: it.description,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            discountAmt: it.discountAmt,
            taxRate: it.taxRate,
            lineTotal: it.lineTotal,
            sortOrder: it.sortOrder,
          })),
        },
      },
      include: orderDetailInclude,
    });

    await tx.quotation.update({ where: { id: quotation.id }, data: { status: 'converted' } });
    return newOrder;
  });

  return created(order);
});
