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
  const { search, triggerServiceId, isActive, page, limit } = parseQuery(
    req,
    adminComplimentaryRuleListQuerySchema,
  );

  const where: Prisma.ComplimentaryRuleWhereInput = {
    ...(triggerServiceId && { triggerServiceId }),
    ...(isActive !== undefined && { isActive }),
    ...(search && {
      OR: [
        { name: { contains: search } },
        { description: { contains: search } },
        { triggerService: { name: { contains: search } } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    db.complimentaryRule.findMany({
      where,
      include: complimentaryRuleInclude,
      orderBy: [{ createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.complimentaryRule.count({ where }),
  ]);

  return ok(items.map(toAdminComplimentaryRule), buildMeta(page, limit, total));
});

export const POST = route(async (req) => {
  const claims = requireAdminAuth(req);
  const body = await parseBody(req, adminComplimentaryRuleCreateSchema);
  const orgId = await resolveOrgId();

  const service = await db.service.findUnique({ where: { id: body.triggerServiceId } });
  if (!service) throw Errors.badRequest('Selected service no longer exists.');

  const productIds = body.assignments.map((a) => a.productId);
  const productCount = await db.product.count({ where: { id: { in: productIds } } });
  if (productCount !== productIds.length) {
    throw Errors.badRequest('One or more selected products no longer exist.');
  }

  const rule = await db.$transaction(async (tx) => {
    const created = await tx.complimentaryRule.create({
      data: {
        orgId,
        name: body.name,
        description: body.description ?? null,
        triggerServiceId: body.triggerServiceId,
        isActive: body.isActive,
        createdByAdminId: claims.sub,
        assignments: {
          create: body.assignments.map((a) => ({
            productId: a.productId,
            quantity: a.quantity,
          })),
        },
      },
      include: complimentaryRuleInclude,
    });
    return created;
  });

  return created(toAdminComplimentaryRule(rule));
});
