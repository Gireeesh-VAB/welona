import { db } from '@/lib/db';
import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { resolveOrgId } from '@/lib/org';

type Ctx = { params: { id: string } };

/**
 * GET /api/v1/admin/customers/[id]/followups — every follow-up interaction for the
 * customer: both entries linked directly to the customer and those logged
 * against any of the customer's enquiries (leads).
 */
export const GET = route<Ctx>(async (req, { params }) => {
  requireAdminAuth(req);
  const orgId = await resolveOrgId();

  const customer = await db.customer.findFirst({
    where: { id: params.id, orgId },
  });
  if (!customer) throw Errors.notFound('Customer');

  const followUps = await db.followUp.findMany({
    where: {
      orgId,
      OR: [{ customerId: params.id }, { lead: { customerId: params.id } }],
    },
    orderBy: { createdAt: 'desc' },
  });
  return ok(followUps);
});
