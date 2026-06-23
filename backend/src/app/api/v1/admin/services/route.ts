import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import {
  adminServiceCreateSchema,
  adminServiceListQuerySchema,
} from '@shared/schemas/admin-services';
import { toAdminService, serviceInclude } from '@/lib/admin-service-mapper';

/**
 * Admin master-data: services and products.
 *
 * GET  /api/v1/admin/services?search=&categoryId=&active=&page=&limit=
 * POST /api/v1/admin/services
 */
export const GET = route(async (req) => {
  // Org-wide reference data; branch sessions read it. Writes stay admin-only.
  requireAdminAuth(req);
  const { search, categoryId, active, page, limit } = parseQuery(
    req,
    adminServiceListQuerySchema,
  );

  const where: Prisma.ServiceWhereInput = {
    ...(categoryId && { categoryId }),
    ...(active === 'active' && { isActive: true }),
    ...(active === 'inactive' && { isActive: false }),
    ...(search && {
      OR: [
        { name: { contains: search } },
        { hsnSacCode: { contains: search } },
        { category: { name: { contains: search } } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    db.service.findMany({
      where,
      include: serviceInclude,
      orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.service.count({ where }),
  ]);

  return ok(items.map(toAdminService), buildMeta(page, limit, total));
});

export const POST = route(async (req) => {
  const claims = requireAdminAuth(req);
  const body = await parseBody(req, adminServiceCreateSchema);

  const category = await db.category.findUnique({ where: { id: body.categoryId } });
  if (!category) throw Errors.badRequest('Selected category no longer exists.');

  if (body.inventoryItems?.length) {
    const productIds = body.inventoryItems.map((i) => i.productId);
    const found = await db.product.count({ where: { id: { in: productIds }, isActive: true } });
    if (found !== productIds.length) {
      throw Errors.badRequest('One or more selected products do not exist or are inactive.');
    }
  }

  const row = await db.$transaction(async (tx) => {
    const service = await tx.service.create({
      data: {
        categoryId: body.categoryId,
        name: body.name,
        hsnSacCode: body.hsnSacCode ?? null,
        minPrice: body.minPrice,
        maxPrice: body.maxPrice,
        taxPercent: body.taxPercent,
        taxType: body.taxType,
        hasMeasurements: body.hasMeasurements,
        hasComplementary: body.hasComplementary,
        sessions: body.sessions ?? 1,
        isActive: body.isActive,
        createdByAdminId: claims.sub,
      },
    });
    if (body.inventoryItems?.length) {
      await tx.serviceInventoryItem.createMany({
        data: body.inventoryItems.map((item, i) => ({
          serviceId: service.id,
          productId: item.productId,
          quantityPerSession: item.quantityPerSession,
          chargeType: item.chargeType ?? 'consume_only',
          lowStockThreshold: item.lowStockThreshold ?? null,
          sortOrder: item.sortOrder ?? i,
        })),
      });
    }
    return tx.service.findUniqueOrThrow({ where: { id: service.id }, include: serviceInclude });
  });
  return created(toAdminService(row));
});
