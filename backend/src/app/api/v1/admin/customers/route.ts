import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { requireAdminAuth } from '@/lib/auth/service';
import { resolveOrgId } from '@/lib/org';
import { customerCreateSchema, listQuerySchema } from '@shared/schemas/sales';
import { serializeCustomer } from '@/lib/sales/serializers';

/**
 * Admin-panel customers (admin + branch sessions).
 *
 * GET  /api/v1/admin/customers — paginated, searchable customer list.
 * POST /api/v1/admin/customers — create a customer.
 *
 * see all branches and may pass an optional `branchId` filter. The employee
 * panel keeps its own `/api/v1/customers` routes (staff RBAC) untouched.
 */
export const GET = route(async (req) => {
  requireAdminAuth(req);
  const orgId = await resolveOrgId();
  const query = parseQuery(req, listQuerySchema);

  const where: Prisma.CustomerWhereInput = { orgId };
  // Branch sessions are locked to their branch regardless of the query.
  const branchId = query.branchId;
  if (branchId) where.branchId = branchId;
  if (query.search) {
    where.OR = [
      { name: { contains: query.search } },
      { phone: { contains: query.search } },
      { email: { contains: query.search } },
      { companyName: { contains: query.search } },
    ];
  }

  const [rows, total] = await Promise.all([
    db.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: { branch: { select: { id: true, name: true } }, state: { select: { id: true, name: true } } },
    }),
    db.customer.count({ where }),
  ]);

  return ok(rows.map(serializeCustomer), buildMeta(query.page, query.limit, total));
});

export const POST = route(async (req) => {
  requireAdminAuth(req);
  const orgId = await resolveOrgId();
  const body = await parseBody(req, customerCreateSchema);

  const customer = await db.customer.create({
    data: {
      orgId,
      // Branch sessions pin the new customer to their branch.
      branchId: body.branchId ?? null,
      type: body.type,
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      companyName: body.companyName || null,
      gstin: body.gstin || null,
      address: body.address || null,
      city: body.city || null,
      stateId: body.stateId ?? null,
      country: body.country || null,
      notes: body.notes || null,
      tags: JSON.stringify(body.tags ?? []),
      createdById: null,
    },
    include: { state: { select: { id: true, name: true } } },
  });

  return created(serializeCustomer(customer));
});
