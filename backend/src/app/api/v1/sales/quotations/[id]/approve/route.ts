import { db } from '@/lib/db';
import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { QUOTATION_TRANSITIONS, assertTransition } from '@/lib/sales/transitions';
import { quotationDetailInclude } from '@/lib/sales/includes';

type Ctx = { params: { id: string } };

/** POST /api/v1/sales/quotations/[id]/approve — customer approved the quote. */
export const POST = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'sales:update');

  const quotation = await db.quotation.findFirst({
    where: { id: params.id, orgId: claims.orgId },
  });
  if (!quotation) throw Errors.notFound('Quotation');
  assertTransition(QUOTATION_TRANSITIONS, quotation.status, 'approved', 'quotation');

  const updated = await db.quotation.update({
    where: { id: params.id },
    data: { status: 'approved', approvedAt: new Date(), approvedById: claims.sub },
    include: quotationDetailInclude,
  });
  return ok(updated);
});
