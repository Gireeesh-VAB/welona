import { z } from 'zod';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { rfqInclude, toRFQ } from '@/lib/rfq-mapper';

interface RouteContext {
  params: { id: string; quoteId: string };
}

const quoteActionSchema = z.object({
  action: z.enum(['accept', 'reject']),
});

/**
 * PATCH /api/v1/admin/procurement/rfq/[id]/quotes/[quoteId]
 * Accept or reject a specific supplier quote.
 * Accepting one quote automatically rejects all others on this RFQ.
 */
export const PATCH = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  const { action } = await parseBody(req, quoteActionSchema);

  const rfq = await db.procurementRFQ.findUnique({
    where: { id: params.id },
    select: { id: true, status: true },
  });
  if (!rfq) throw Errors.notFound('RFQ');

  if (rfq.status === 'cancelled' || rfq.status === 'ordered') {
    throw Errors.badRequest(`Cannot update quotes on an RFQ with status "${rfq.status}".`);
  }

  const quote = await db.supplierQuote.findUnique({
    where: { id: params.quoteId },
    select: { id: true, rfqId: true, status: true },
  });
  if (!quote || quote.rfqId !== params.id) throw Errors.notFound('Supplier quote');

  await db.$transaction(async (tx) => {
    if (action === 'accept') {
      // Accept this quote, reject all others
      await tx.supplierQuote.update({
        where: { id: params.quoteId },
        data: { status: 'accepted' },
      });
      await tx.supplierQuote.updateMany({
        where: { rfqId: params.id, id: { not: params.quoteId } },
        data: { status: 'rejected' },
      });
    } else {
      await tx.supplierQuote.update({
        where: { id: params.quoteId },
        data: { status: 'rejected' },
      });
    }
  });

  const updatedRFQ = await db.procurementRFQ.findUnique({
    where: { id: params.id },
    include: rfqInclude,
  });

  return ok(toRFQ(updatedRFQ));
});
