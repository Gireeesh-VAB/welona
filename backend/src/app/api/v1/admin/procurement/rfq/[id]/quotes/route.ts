import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { supplierQuoteUpsertSchema } from '@shared/schemas/admin-rfq';
import { rfqInclude, toRFQ } from '@/lib/rfq-mapper';

interface RouteContext {
  params: { id: string };
}

/**
 * POST /api/v1/admin/procurement/rfq/[id]/quotes
 * Upsert a supplier quote (create or update if supplier already quoted).
 */
export const POST = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  const body = await parseBody(req, supplierQuoteUpsertSchema);

  const rfq = await db.procurementRFQ.findUnique({
    where: { id: params.id },
    select: { id: true, status: true },
  });
  if (!rfq) throw Errors.notFound('RFQ');

  if (rfq.status === 'cancelled' || rfq.status === 'ordered') {
    throw Errors.badRequest(`Cannot add quotes to an RFQ with status "${rfq.status}".`);
  }

  const supplier = await db.supplier.findUnique({ where: { id: body.supplierId }, select: { id: true } });
  if (!supplier) throw Errors.badRequest('Supplier not found.');

  const productIds = body.items.map((i) => i.productId);
  const products = await db.product.findMany({ where: { id: { in: productIds } }, select: { id: true } });
  if (products.length !== productIds.length) throw Errors.badRequest('One or more products in the quote not found.');

  await db.$transaction(async (tx) => {
    let quote = await tx.supplierQuote.findUnique({
      where: { rfqId_supplierId: { rfqId: params.id, supplierId: body.supplierId } },
      select: { id: true },
    });

    if (quote) {
      await tx.supplierQuoteItem.deleteMany({ where: { quoteId: quote.id } });
      await tx.supplierQuote.update({
        where: { id: quote.id },
        data: {
          status: 'submitted',
          submittedAt: new Date(),
          validUntil: body.validUntil ? new Date(body.validUntil) : null,
          notes: body.notes ?? null,
        },
      });
    } else {
      quote = await tx.supplierQuote.create({
        data: {
          rfqId: params.id,
          supplierId: body.supplierId,
          status: 'submitted',
          submittedAt: new Date(),
          validUntil: body.validUntil ? new Date(body.validUntil) : null,
          notes: body.notes ?? null,
        },
        select: { id: true },
      });
    }

    await tx.supplierQuoteItem.createMany({
      data: body.items.map((i) => ({
        quoteId: quote!.id,
        productId: i.productId,
        unitPrice: i.unitPrice,
        deliveryDays: i.deliveryDays,
        moq: i.moq ?? null,
        notes: i.notes ?? null,
      })),
    });

    if (rfq.status === 'sent' || rfq.status === 'draft') {
      await tx.procurementRFQ.update({ where: { id: params.id }, data: { status: 'comparing' } });
    }
  });

  const updatedRFQ = await db.procurementRFQ.findUnique({
    where: { id: params.id },
    include: rfqInclude,
  });

  return ok(toRFQ(updatedRFQ));
});
