import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { customerUpdateSchema } from '@/lib/sales/schemas';
import { serializeCustomer } from '@/lib/sales/serializers';

type Ctx = { params: { id: string } };

/** Load an org-scoped customer or throw 404. */
async function loadCustomer(orgId: string, id: string) {
  const customer = await db.customer.findFirst({
    where: { id, orgId },
    include: { branch: { select: { id: true, name: true } } },
  });
  if (!customer) throw Errors.notFound('Customer');
  return customer;
}

/** GET /api/v1/customers/[id] — customer detail. */
export const GET = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'customers:read');
  return ok(serializeCustomer(await loadCustomer(claims.orgId, params.id)));
});

/** PATCH /api/v1/customers/[id] — update customer fields. */
export const PATCH = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'customers:update');
  await loadCustomer(claims.orgId, params.id);
  const body = await parseBody(req, customerUpdateSchema);

  const data: Prisma.CustomerUpdateInput = {};
  if (body.type !== undefined) data.type = body.type;
  if (body.name !== undefined) data.name = body.name;
  if (body.email !== undefined) data.email = body.email || null;
  if (body.phone !== undefined) data.phone = body.phone || null;
  if (body.companyName !== undefined) data.companyName = body.companyName || null;
  if (body.gstin !== undefined) data.gstin = body.gstin || null;
  if (body.address !== undefined) data.address = body.address || null;
  if (body.city !== undefined) data.city = body.city || null;
  if (body.notes !== undefined) data.notes = body.notes || null;
  if (body.avatarUrl !== undefined) data.avatarUrl = body.avatarUrl || null;
  if (body.tags !== undefined) data.tags = JSON.stringify(body.tags);
  if (body.branchId !== undefined) {
    data.branch = body.branchId ? { connect: { id: body.branchId } } : { disconnect: true };
  }

  const updated = await db.customer.update({ where: { id: params.id }, data });
  return ok(serializeCustomer(updated));
});

/** DELETE /api/v1/customers/[id] — soft delete (deactivate). */
export const DELETE = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'customers:delete');
  await loadCustomer(claims.orgId, params.id);

  await db.customer.update({ where: { id: params.id }, data: { isActive: false } });
  return ok({ deactivated: true });
});
