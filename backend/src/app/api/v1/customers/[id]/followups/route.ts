import { db } from '@/lib/db';
import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth, requirePermission } from '@/lib/auth/service';

type Ctx = { params: { id: string } };

/**
 * GET /api/v1/customers/[id]/followups — every follow-up interaction for the
 * customer: both entries linked directly to the customer and those logged
 * against any of the customer's enquiries (leads).
 */
export const GET = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'customers:read');

  const customer = await db.customer.findFirst({
    where: { id: params.id, orgId: claims.orgId },
  });
  if (!customer) throw Errors.notFound('Customer');

  const followUps = await db.followUp.findMany({
    where: {
      orgId: claims.orgId,
      OR: [{ customerId: params.id }, { lead: { customerId: params.id } }],
    },
    orderBy: { createdAt: 'desc' },
  });
  return ok(followUps);
});
