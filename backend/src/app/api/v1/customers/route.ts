import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { customerCreateSchema, listQuerySchema } from '@shared/schemas/sales';
import { serializeCustomer } from '@/lib/sales/serializers';

/**
 * GET  /api/v1/customers — paginated, searchable customer list.
 * POST /api/v1/customers — create a customer.
 *
 * Branch scoping: staff members assigned to a branch only see customers
 * belonging to that branch. Org-wide staff (branchIds=[]) see all.
 */
export const GET = route(async (req) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'customers:read');
  const query = parseQuery(req, listQuerySchema);

  const staffBranchId = claims.branchIds[0] ?? null;
  const where: Prisma.CustomerWhereInput = { orgId: claims.orgId };
  // Explicit query param takes precedence; otherwise auto-scope to staff's branch.
  const effectiveBranchId = query.branchId ?? staffBranchId;
  if (effectiveBranchId) where.branchId = effectiveBranchId;
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
      include: { branch: { select: { id: true, name: true } } },
    }),
    db.customer.count({ where }),
  ]);

  return ok(rows.map(serializeCustomer), buildMeta(query.page, query.limit, total));
});

export const POST = route(async (req) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'customers:create');
  const body = await parseBody(req, customerCreateSchema);

  const customer = await db.customer.create({
    data: {
      orgId: claims.orgId,
      branchId: body.branchId ?? null,
      type: body.type,
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      companyName: body.companyName || null,
      gstin: body.gstin || null,
      address: body.address || null,
      city: body.city || null,
      notes: body.notes || null,
      tags: JSON.stringify(body.tags ?? []),
      createdById: claims.sub,
    },
  });

  return created(serializeCustomer(customer));
});
