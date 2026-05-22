import { db } from '@/lib/db';
import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { INVOICE_TRANSITIONS, assertTransition } from '@/lib/sales/transitions';
import { invoiceDetailInclude } from '@/lib/sales/includes';

type Ctx = { params: { id: string } };

/** POST /api/v1/sales/invoices/[id]/issue — issue a draft invoice. */
export const POST = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'sales:update');

  const invoice = await db.invoice.findFirst({
    where: { id: params.id, orgId: claims.orgId },
  });
  if (!invoice) throw Errors.notFound('Invoice');
  assertTransition(INVOICE_TRANSITIONS, invoice.status, 'issued', 'invoice');

  const updated = await db.invoice.update({
    where: { id: params.id },
    data: { status: 'issued', issuedAt: new Date() },
    include: invoiceDetailInclude,
  });
  return ok(updated);
});
