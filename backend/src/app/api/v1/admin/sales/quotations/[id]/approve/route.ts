import { db } from '@/lib/db';
import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { resolveOrgId } from '@/lib/org';
import { QUOTATION_TRANSITIONS, assertTransition } from '@/lib/sales/transitions';
import { quotationDetailInclude } from '@/lib/sales/includes';

type Ctx = { params: { id: string } };

/** POST /api/v1/admin/sales/quotations/[id]/approve — customer approved the quote. */
export const POST = route<Ctx>(async (req, { params }) => {
  requireAdminAuth(req);
  const orgId = await resolveOrgId();

  const quotation = await db.quotation.findFirst({
    where: { id: params.id, orgId },
  });
  if (!quotation) throw Errors.notFound('Quotation');
  assertTransition(QUOTATION_TRANSITIONS, quotation.status, 'approved', 'quotation');

  const updated = await db.quotation.update({
    where: { id: params.id },
    data: { status: 'approved', approvedAt: new Date(), approvedById: null },
    include: quotationDetailInclude,
  });
  return ok(updated);
});
