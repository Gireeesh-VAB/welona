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
import { toAdminService } from '@/lib/admin-service-mapper';

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
      include: { category: true, createdByAdmin: true },
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

  const row = await db.service.create({
    data: {
      categoryId: body.categoryId,
      name: body.name,
      hsnSacCode: body.hsnSacCode ?? null,
      minPrice: body.minPrice,
      maxPrice: body.maxPrice,
      taxPercent: body.taxPercent,
      hasMeasurements: body.hasMeasurements,
      hasComplementary: body.hasComplementary,
      isActive: body.isActive,
      createdByAdminId: claims.sub,
    },
    include: { category: true, createdByAdmin: true },
  });
  return created(toAdminService(row));
});
