import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok, created } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { resolveOrgId } from '@/lib/org';
import { offerCreateSchema } from '@shared/schemas/customer-modules';

type Ctx = { params: { id: string } };

async function requireCustomer(orgId: string, id: string) {
  const customer = await db.customer.findFirst({
    where: { id, orgId },
  });
  if (!customer) throw Errors.notFound('Customer');
  return customer;
}

/** GET /api/v1/admin/customers/[id]/offers — offers for a customer. */
export const GET = route<Ctx>(async (req, { params }) => {
  requireAdminAuth(req);
  const orgId = await resolveOrgId();
  await requireCustomer(orgId, params.id);

  const offers = await db.offer.findMany({
    where: { customerId: params.id },
    orderBy: { createdAt: 'desc' },
  });
  return ok(offers);
});

/** POST /api/v1/admin/customers/[id]/offers — create an offer. */
export const POST = route<Ctx>(async (req, { params }) => {
  requireAdminAuth(req);
  const orgId = await resolveOrgId();
  const customer = await requireCustomer(orgId, params.id);

  const body = await parseBody(req, offerCreateSchema);
  const status = body.status ?? 'active';
  const offer = await db.offer.create({
    data: {
      orgId: orgId,
      customerId: customer.id,
      title: body.title,
      description: body.description || null,
      discountType: body.discountType,
      discountValue: body.discountValue,
      validFrom: body.validFrom ? new Date(body.validFrom) : null,
      validUntil: body.validUntil ? new Date(body.validUntil) : null,
      status,
      redeemedAt: status === 'redeemed' ? new Date() : null,
      createdById: null,
    },
  });
  return created(offer);
});
