import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok, created } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { feedbackCreateSchema } from '@/lib/customer-modules';

type Ctx = { params: { id: string } };

async function requireCustomer(orgId: string, id: string) {
  const customer = await db.customer.findFirst({ where: { id, orgId } });
  if (!customer) throw Errors.notFound('Customer');
  return customer;
}

/** GET /api/v1/customers/[id]/feedback — feedback left by a customer. */
export const GET = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'customers:read');
  await requireCustomer(claims.orgId, params.id);

  const feedback = await db.feedback.findMany({
    where: { customerId: params.id },
    orderBy: { createdAt: 'desc' },
  });
  return ok(feedback);
});

/** POST /api/v1/customers/[id]/feedback — record customer feedback. */
export const POST = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'customers:create');
  const customer = await requireCustomer(claims.orgId, params.id);

  const body = await parseBody(req, feedbackCreateSchema);
  const feedback = await db.feedback.create({
    data: {
      orgId: claims.orgId,
      customerId: customer.id,
      rating: body.rating,
      comment: body.comment || null,
      relatedTo: body.relatedTo || null,
      createdById: claims.sub,
    },
  });
  return created(feedback);
});
