import { db } from '@/lib/db';
import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { QUOTATION_TRANSITIONS, assertTransition } from '@/lib/sales/transitions';
import { quotationDetailInclude } from '@/lib/sales/includes';

type Ctx = { params: { id: string } };

/** POST /api/v1/sales/quotations/[id]/send — mark a draft quotation as sent. */
export const POST = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'sales:update');

  const quotation = await db.quotation.findFirst({
    where: { id: params.id, orgId: claims.orgId },
    include: { items: true },
  });
  if (!quotation) throw Errors.notFound('Quotation');
  if (quotation.items.length === 0) {
    throw Errors.badRequest('Add at least one line item before sending the quotation');
  }
  assertTransition(QUOTATION_TRANSITIONS, quotation.status, 'sent', 'quotation');

  const updated = await db.quotation.update({
    where: { id: params.id },
    data: { status: 'sent', sentAt: new Date() },
    include: quotationDetailInclude,
  });
  return ok(updated);
});
