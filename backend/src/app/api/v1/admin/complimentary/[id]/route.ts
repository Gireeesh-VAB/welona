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

interface RouteContext {
  params: { id: string };
}

export const GET = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  const rule = await db.complimentaryRule.findUnique({
    where: { id: params.id },
    include: complimentaryRuleInclude,
  });
  if (!rule) throw Errors.notFound('Complimentary rule');
  return ok(toAdminComplimentaryRule(rule));
});

export const PUT = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  const body = await parseBody(req, adminComplimentaryRuleUpdateSchema);

  if (body.triggerServiceId) {
    const service = await db.service.findUnique({ where: { id: body.triggerServiceId } });
    if (!service) throw Errors.badRequest('Selected service no longer exists.');
  }

  if (body.assignments) {
    const productIds = body.assignments.map((a) => a.productId);
    const productCount = await db.product.count({ where: { id: { in: productIds } } });
    if (productCount !== productIds.length) {
      throw Errors.badRequest('One or more selected products no longer exist.');
    }
  }

  try {
    const rule = await db.$transaction(async (tx) => {
      // Replace assignments if provided (delete-all + re-insert).
      if (body.assignments) {
        await tx.complimentaryProductAssignment.deleteMany({
          where: { ruleId: params.id },
        });
      }

      return tx.complimentaryRule.update({
        where: { id: params.id },
        data: {
          ...(body.name !== undefined && { name: body.name }),
          ...(body.description !== undefined && { description: body.description ?? null }),
          ...(body.triggerServiceId !== undefined && {
            triggerServiceId: body.triggerServiceId,
          }),
          ...(body.isActive !== undefined && { isActive: body.isActive }),
          ...(body.assignments !== undefined && {
            assignments: {
              create: body.assignments.map((a) => ({
                productId: a.productId,
                quantity: a.quantity,
              })),
            },
          }),
        },
        include: complimentaryRuleInclude,
      });
    });
    return ok(toAdminComplimentaryRule(rule));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') throw Errors.notFound('Complimentary rule');
    }
    throw error;
  }
});

export const DELETE = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  try {
    await db.complimentaryRule.delete({ where: { id: params.id } });
    return ok({ deleted: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') throw Errors.notFound('Complimentary rule');
    }
    throw error;
  }
});
