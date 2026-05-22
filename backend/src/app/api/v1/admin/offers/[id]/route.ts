import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminOfferUpdateSchema } from '@shared/schemas/admin-offers';
import { toAdminOffer } from '@/lib/admin-offer-mapper';

interface RouteContext {
  params: { id: string };
}

const fullInclude = {
  createdByAdmin: true,
  branches: { include: { branch: { include: { zone: true } } } },
  items: { include: { category: true, service: true } },
} satisfies Prisma.MarketingOfferInclude;

/**
 * PUT  /api/v1/admin/offers/:id — partial update. Branches and items, if
 * provided, fully replace the existing sets (delete-all-then-create) inside
 * a single transaction so the offer is never in a half-updated state.
 * DELETE /api/v1/admin/offers/:id — cascades to branches + items.
 */
export const PUT = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  const body = await parseBody(req, adminOfferUpdateSchema);

  if (body.branchIds) {
    const branches = await db.branch.findMany({
      where: { id: { in: body.branchIds } },
      select: { id: true },
    });
    if (branches.length !== body.branchIds.length) {
      throw Errors.badRequest('One or more selected branches no longer exist.');
    }
  }
  if (body.items) {
    for (const it of body.items) {
      const svc = await db.service.findUnique({
        where: { id: it.serviceId },
        select: { categoryId: true },
      });
      if (!svc) throw Errors.badRequest('A selected service no longer exists.');
      if (svc.categoryId !== it.categoryId) {
        throw Errors.badRequest('A service does not belong to the selected category.');
      }
    }
  }

  try {
    const row = await db.$transaction(async (tx) => {
      // Apply the scalar updates first.
      await tx.marketingOffer.update({
        where: { id: params.id },
        data: {
          ...(body.packageName !== undefined && { packageName: body.packageName }),
          ...(body.packageCode !== undefined && { packageCode: body.packageCode }),
          ...(body.fromDate !== undefined && { fromDate: new Date(body.fromDate) }),
          ...(body.toDate !== undefined && { toDate: new Date(body.toDate) }),
          ...(body.minAmount !== undefined && { minAmount: body.minAmount }),
          ...(body.maxAmount !== undefined && { maxAmount: body.maxAmount }),
          ...(body.remarks !== undefined && { remarks: body.remarks ?? null }),
          ...(body.frontImageUrl !== undefined && {
            frontImageUrl: body.frontImageUrl ?? null,
          }),
          ...(body.isActive !== undefined && { isActive: body.isActive }),
        },
      });

      if (body.branchIds) {
        await tx.marketingOfferBranch.deleteMany({ where: { offerId: params.id } });
        await tx.marketingOfferBranch.createMany({
          data: body.branchIds.map((bid: string) => ({
            offerId: params.id,
            branchId: bid,
          })),
        });
      }

      if (body.items) {
        await tx.marketingOfferItem.deleteMany({ where: { offerId: params.id } });
        for (const [idx, it] of body.items.entries()) {
          await tx.marketingOfferItem.create({
            data: {
              offerId: params.id,
              categoryId: it.categoryId,
              serviceId: it.serviceId,
              quantity: it.quantity,
              sortOrder: idx,
            },
          });
        }
      }

      return tx.marketingOffer.findUniqueOrThrow({
        where: { id: params.id },
        include: fullInclude,
      });
    });
    return ok(toAdminOffer(row));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') throw Errors.notFound('Offer');
      if (error.code === 'P2002') throw Errors.conflict('Package code is already in use.');
    }
    throw error;
  }
});

export const DELETE = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  try {
    await db.marketingOffer.delete({ where: { id: params.id } });
    return ok({ deleted: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw Errors.notFound('Offer');
    }
    throw error;
  }
});
