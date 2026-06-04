import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminOrBranchAuth } from '@/lib/auth/service';
import { resolveOrgId } from '@/lib/org';
import { customerUpdateSchema } from '@shared/schemas/sales';
import { serializeCustomer } from '@/lib/sales/serializers';

type Ctx = { params: { id: string } };

/**
 * Load an org-scoped customer, additionally restricted to `branchScope` for
 * branch sessions. Uses 404 (not 403) on a cross-branch id so existence isn't
 * leaked.
 */
async function loadCustomer(orgId: string, id: string, branchScope: string | null) {
  const customer = await db.customer.findFirst({
    where: { id, orgId, ...(branchScope && { branchId: branchScope }) },
    include: { branch: { select: { id: true, name: true } } },
  });
  if (!customer) throw Errors.notFound('Customer');
  return customer;
}

/** GET /api/v1/admin/customers/[id] — customer detail. */
export const GET = route<Ctx>(async (req, { params }) => {
  const { branchScope } = requireAdminOrBranchAuth(req);
  const orgId = await resolveOrgId();
  return ok(serializeCustomer(await loadCustomer(orgId, params.id, branchScope)));
});

/** PATCH /api/v1/admin/customers/[id] — update customer fields. */
export const PATCH = route<Ctx>(async (req, { params }) => {
  const { branchScope } = requireAdminOrBranchAuth(req);
  const orgId = await resolveOrgId();
  await loadCustomer(orgId, params.id, branchScope);
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
  if (body.branchId !== undefined && !branchScope) {
    // Only admins may move a customer between branches; branch sessions can't.
    data.branch = body.branchId ? { connect: { id: body.branchId } } : { disconnect: true };
  }

  const updated = await db.customer.update({ where: { id: params.id }, data });
  return ok(serializeCustomer(updated));
});

/** DELETE /api/v1/admin/customers/[id] — soft delete (deactivate). */
export const DELETE = route<Ctx>(async (req, { params }) => {
  const { branchScope } = requireAdminOrBranchAuth(req);
  const orgId = await resolveOrgId();
  await loadCustomer(orgId, params.id, branchScope);

  await db.customer.update({ where: { id: params.id }, data: { isActive: false } });
  return ok({ deactivated: true });
});
