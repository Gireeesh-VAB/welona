import { db } from '@/lib/db';
import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminOrBranchAuth } from '@/lib/auth/service';
import { resolveOrgId } from '@/lib/org';
import { invoiceDetailInclude } from '@/lib/sales/includes';

type Ctx = { params: { id: string } };

/** GET /api/v1/admin/sales/invoices/[id] — invoice detail with payments. */
export const GET = route<Ctx>(async (req, { params }) => {
  const { branchScope } = requireAdminOrBranchAuth(req);
  const orgId = await resolveOrgId();

  const invoice = await db.invoice.findFirst({
    where: { id: params.id, orgId, ...(branchScope && { branchId: branchScope }) },
    include: invoiceDetailInclude,
  });
  if (!invoice) throw Errors.notFound('Invoice');

  return ok(invoice);
});
