import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok, created } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { packageCreateSchema } from '@shared/schemas/customer-modules';

type Ctx = { params: { id: string } };

async function requireCustomer(orgId: string, id: string) {
  const customer = await db.customer.findFirst({ where: { id, orgId } });
  if (!customer) throw Errors.notFound('Customer');
  return customer;
}

/** GET /api/v1/customers/[id]/packages — packages for a customer. */
export const GET = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'customers:read');
  await requireCustomer(claims.orgId, params.id);

  const packages = await db.package.findMany({
    where: { customerId: params.id },
    orderBy: { createdAt: 'desc' },
  });
  return ok(packages);
});

/** POST /api/v1/customers/[id]/packages — create a package. */
export const POST = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'customers:create');
  const customer = await requireCustomer(claims.orgId, params.id);

  const body = await parseBody(req, packageCreateSchema);
  if (body.usedSessions > body.totalSessions) {
    throw Errors.badRequest('Used sessions cannot exceed total sessions');
  }
  const pkg = await db.package.create({
    data: {
      orgId: claims.orgId,
      customerId: customer.id,
      treatmentId: body.treatmentId ?? null,
      name: body.name,
      totalSessions: body.totalSessions,
      usedSessions: body.usedSessions,
      price: body.price,
      purchasedAt: body.purchasedAt ? new Date(body.purchasedAt) : new Date(),
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      status: body.status ?? 'active',
      notes: body.notes || null,
      createdById: claims.sub,
    },
  });
  return created(pkg);
});
