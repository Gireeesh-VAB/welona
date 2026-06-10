import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import {
  adminComplimentaryRuleCreateSchema,
  adminComplimentaryRuleListQuerySchema,
} from '@shared/schemas/admin-complimentary';
import {
  toAdminComplimentaryRule,
  complimentaryRuleInclude,
} from '@/lib/admin-complimentary-mapper';

async function resolveOrgId(): Promise<string> {
  const org = await db.organization.findFirst({ select: { id: true } });
  if (!org) throw Errors.notFound('Organization');
  return org.id;
}

export const GET = route(async (req) => {
  requireAdminAuth(req);
  const { search, categoryId, branchId, isActive, page, limit } = parseQuery(
    req,
    adminComplimentaryRuleListQuerySchema,
  );

  const where: Prisma.ComplimentaryServiceRuleWhereInput = {
    ...(categoryId && { categoryId }),
    ...(isActive !== undefined && { isActive }),
    ...(branchId && { branches: { some: { branchId } } }),
    ...(search && {
      OR: [
        { name: { contains: search } },
        { category: { name: { contains: search } } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    db.complimentaryServiceRule.findMany({
      where,
      include: complimentaryRuleInclude,
      orderBy: [{ createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.complimentaryServiceRule.count({ where }),
  ]);

  return ok(items.map(toAdminComplimentaryRule), buildMeta(page, limit, total));
});

export const POST = route(async (req) => {
  const claims = requireAdminAuth(req);
  const body = await parseBody(req, adminComplimentaryRuleCreateSchema);
  const orgId = await resolveOrgId();

  const category = await db.category.findUnique({ where: { id: body.categoryId } });
  if (!category) throw Errors.badRequest('Selected category no longer exists.');

  const rule = await db.$transaction(async (tx) => {
    return tx.complimentaryServiceRule.create({
      data: {
        orgId,
        name: body.name,
        categoryId: body.categoryId,
        valueType: 'percentage',
        valueLimit: 0,
        isActive: body.isActive,
        createdByAdminId: claims.sub,
        services: { create: body.serviceIds.map((serviceId) => ({ serviceId })) },
        branches: { create: body.branchIds.map((branchId) => ({ branchId })) },
      },
      include: complimentaryRuleInclude,
    });
  });

  return created(toAdminComplimentaryRule(rule));
});
