import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminOrBranchAuth } from '@/lib/auth/service';
import { resolveOrgId } from '@/lib/org';
import { quotationRejectSchema } from '@shared/schemas/sales';
import { QUOTATION_TRANSITIONS, assertTransition } from '@/lib/sales/transitions';
import { quotationDetailInclude } from '@/lib/sales/includes';

type Ctx = { params: { id: string } };

/** POST /api/v1/admin/sales/quotations/[id]/reject — customer rejected the quote. */
export const POST = route<Ctx>(async (req, { params }) => {
  const { branchScope } = requireAdminOrBranchAuth(req);
  const orgId = await resolveOrgId();
  const body = await parseBody(req, quotationRejectSchema);

  const quotation = await db.quotation.findFirst({
    where: { id: params.id, orgId, ...(branchScope && { branchId: branchScope }) },
  });
  if (!quotation) throw Errors.notFound('Quotation');
  assertTransition(QUOTATION_TRANSITIONS, quotation.status, 'rejected', 'quotation');

  const updated = await db.quotation.update({
    where: { id: params.id },
    data: { status: 'rejected', rejectedReason: body.reason },
    include: quotationDetailInclude,
  });
  return ok(updated);
});
