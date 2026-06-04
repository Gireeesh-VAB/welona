import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok, created } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminOrBranchAuth } from '@/lib/auth/service';
import { resolveOrgId } from '@/lib/org';
import { feedbackCreateSchema } from '@shared/schemas/customer-modules';

type Ctx = { params: { id: string } };

async function requireCustomer(orgId: string, id: string, branchScope: string | null) {
  const customer = await db.customer.findFirst({
    where: { id, orgId, ...(branchScope && { branchId: branchScope }) },
  });
  if (!customer) throw Errors.notFound('Customer');
  return customer;
}

/** GET /api/v1/admin/customers/[id]/feedback — feedback left by a customer. */
export const GET = route<Ctx>(async (req, { params }) => {
  const { branchScope } = requireAdminOrBranchAuth(req);
  const orgId = await resolveOrgId();
  await requireCustomer(orgId, params.id, branchScope);

  const feedback = await db.feedback.findMany({
    where: { customerId: params.id },
    orderBy: { createdAt: 'desc' },
  });
  return ok(feedback);
});

/** POST /api/v1/admin/customers/[id]/feedback — record customer feedback. */
export const POST = route<Ctx>(async (req, { params }) => {
  const { branchScope } = requireAdminOrBranchAuth(req);
  const orgId = await resolveOrgId();
  const customer = await requireCustomer(orgId, params.id, branchScope);

  const body = await parseBody(req, feedbackCreateSchema);
  const feedback = await db.feedback.create({
    data: {
      orgId,
      customerId: customer.id,
      rating: body.rating,
      comment: body.comment || null,
      relatedTo: body.relatedTo || null,
      createdById: null,
    },
  });
  return created(feedback);
});
