import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminComplimentaryRuleUpdateSchema } from '@shared/schemas/admin-complimentary';
import {
  toAdminComplimentaryRule,
  complimentaryRuleInclude,
} from '@/lib/admin-complimentary-mapper';

interface RouteContext { params: { id: string } }

export const PUT = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  const body = await parseBody(req, adminComplimentaryRuleUpdateSchema);

  try {
    const rule = await db.$transaction(async (tx) => {
      if (body.serviceIds) {
        await tx.complimentaryServiceItem.deleteMany({ where: { ruleId: params.id } });
      }
      if (body.branchIds) {
        await tx.complimentaryServiceBranch.deleteMany({ where: { ruleId: params.id } });
      }

      return tx.complimentaryServiceRule.update({
        where: { id: params.id },
        data: {
          ...(body.name !== undefined && { name: body.name }),
          ...(body.categoryId !== undefined && { categoryId: body.categoryId }),
          ...(body.isActive !== undefined && { isActive: body.isActive }),
          ...(body.serviceIds && {
            services: { create: body.serviceIds.map((serviceId) => ({ serviceId })) },
          }),
          ...(body.branchIds && {
            branches: { create: body.branchIds.map((branchId) => ({ branchId })) },
          }),
        },
        include: complimentaryRuleInclude,
      });
    });
    return ok(toAdminComplimentaryRule(rule));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw Errors.notFound('Complimentary rule');
    }
    throw error;
  }
});

export const DELETE = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  try {
    await db.complimentaryServiceRule.delete({ where: { id: params.id } });
    return ok({ deleted: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw Errors.notFound('Complimentary rule');
    }
    throw error;
  }
});
