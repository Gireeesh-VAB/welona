import { db } from '@/lib/db';
import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { invoiceDetailInclude } from '@/lib/sales/includes';

type Ctx = { params: { id: string } };

/** GET /api/v1/sales/invoices/[id] — invoice detail with payments. */
export const GET = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'sales:read');

  const invoice = await db.invoice.findFirst({
    where: { id: params.id, orgId: claims.orgId },
    include: invoiceDetailInclude,
  });
  if (!invoice) throw Errors.notFound('Invoice');

  return ok(invoice);
});
