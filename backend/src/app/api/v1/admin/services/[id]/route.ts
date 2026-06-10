import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminServiceUpdateSchema } from '@shared/schemas/admin-services';
import { toAdminService } from '@/lib/admin-service-mapper';

interface RouteContext {
  params: { id: string };
}

export const PUT = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  const body = await parseBody(req, adminServiceUpdateSchema);

  if (body.categoryId) {
    const category = await db.category.findUnique({ where: { id: body.categoryId } });
    if (!category) throw Errors.badRequest('Selected category no longer exists.');
  }

  try {
    const row = await db.service.update({
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
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
      include: { category: true, createdByAdmin: true },
    });
    return ok(toAdminService(row));
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
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
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw Errors.notFound('Service');
    }
    throw error;
  }
});
