import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok, created } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { resolveOrgId } from '@/lib/org';
import { paymentCreateSchema } from '@shared/schemas/sales';
import { recomputeInvoice } from '@/lib/sales/service';
import { invoiceDetailInclude } from '@/lib/sales/includes';

type Ctx = { params: { id: string } };

/** GET /api/v1/admin/sales/invoices/[id]/payments — payments against an invoice. */
export const GET = route<Ctx>(async (req, { params }) => {
  requireAdminAuth(req);
  const orgId = await resolveOrgId();

  const invoice = await db.invoice.findFirst({
    where: { id: params.id, orgId },
  });
  if (!invoice) throw Errors.notFound('Invoice');

  const payments = await db.payment.findMany({
    where: { invoiceId: params.id },
    orderBy: { receivedAt: 'desc' },
  });
  return ok(payments);
});

/**
 * POST /api/v1/admin/sales/invoices/[id]/payments — record a payment. Recomputes
 * the invoice's paid amount/status and cascades to the order.
 */
export const POST = route<Ctx>(async (req, { params }) => {
  requireAdminAuth(req);
  const orgId = await resolveOrgId();
  const body = await parseBody(req, paymentCreateSchema);

  const invoice = await db.invoice.findFirst({
    where: { id: params.id, orgId },
  });
  if (!invoice) throw Errors.notFound('Invoice');
  if (invoice.status === 'draft') {
    throw Errors.badRequest('Issue the invoice before recording a payment');
  }
  if (invoice.status === 'void') {
    throw Errors.badRequest('Cannot record a payment against a void invoice');
  }

  const updated = await db.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        orgId,
        invoiceId: invoice.id,
        amount: body.amount,
        method: body.method,
        reference: body.reference || null,
        receivedAt: body.receivedAt ? new Date(body.receivedAt) : new Date(),
        recordedById: null,
      },
    });
    await recomputeInvoice(tx, invoice.id);
    return tx.invoice.findUnique({ where: { id: invoice.id }, include: invoiceDetailInclude });
  });

  return created(updated);
});
