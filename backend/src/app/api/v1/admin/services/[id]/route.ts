import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminServiceUpdateSchema } from '@shared/schemas/admin-services';
import { toAdminService, serviceInclude } from '@/lib/admin-service-mapper';

interface RouteContext {
  params: { id: string };
}

export const GET = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  const row = await db.service.findUnique({ where: { id: params.id }, include: serviceInclude });
  if (!row) throw Errors.notFound('Service');
  return ok(toAdminService(row));
});

export const PUT = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  const body = await parseBody(req, adminServiceUpdateSchema);

  if (body.categoryId) {
    const category = await db.category.findUnique({ where: { id: body.categoryId } });
    if (!category) throw Errors.badRequest('Selected category no longer exists.');
  }

  // Validate all product IDs before opening the transaction.
  if (body.inventoryItems !== undefined && body.inventoryItems.length > 0) {
    const productIds = body.inventoryItems.map((i) => i.productId);
    const found = await db.product.count({ where: { id: { in: productIds }, isActive: true } });
    if (found !== productIds.length) {
      throw Errors.badRequest('One or more selected products do not exist or are inactive.');
    }
  }

  try {
    const row = await db.$transaction(async (tx) => {
      await tx.service.update({
        where: { id: params.id },
        data: {
          ...(body.categoryId !== undefined && { categoryId: body.categoryId }),
          ...(body.name !== undefined && { name: body.name }),
          ...(body.hsnSacCode !== undefined && { hsnSacCode: body.hsnSacCode ?? null }),
          ...(body.minPrice !== undefined && { minPrice: body.minPrice }),
          ...(body.maxPrice !== undefined && { maxPrice: body.maxPrice }),
          ...(body.taxPercent !== undefined && { taxPercent: body.taxPercent }),
          ...(body.taxType !== undefined && { taxType: body.taxType }),
          ...(body.hasMeasurements !== undefined && { hasMeasurements: body.hasMeasurements }),
          ...(body.hasComplementary !== undefined && { hasComplementary: body.hasComplementary }),
          ...(body.sessions !== undefined && { sessions: body.sessions }),
          ...(body.isActive !== undefined && { isActive: body.isActive }),
        },
      });

      // Full-replace inventory mapping when the field is present.
      if (body.inventoryItems !== undefined) {
        await tx.serviceInventoryItem.deleteMany({ where: { serviceId: params.id } });
        if (body.inventoryItems.length > 0) {
          await tx.serviceInventoryItem.createMany({
            data: body.inventoryItems.map((item) => ({
              serviceId: params.id,
              productId: item.productId,
              quantityPerSession: item.quantityPerSession,
              chargeType: item.chargeType ?? 'consume_only',
              lowStockThreshold: item.lowStockThreshold ?? null,
              sortOrder: item.sortOrder ?? 0,
            })),
          });
        }
      }

      return tx.service.findUniqueOrThrow({ where: { id: params.id }, include: serviceInclude });
    });

    return ok(toAdminService(row));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw Errors.notFound('Service');
    }
    throw error;
  }
});

export const DELETE = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  try {
    await db.service.delete({ where: { id: params.id } });
    return ok({ deleted: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw Errors.notFound('Service');
    }
    throw error;
  }
});
