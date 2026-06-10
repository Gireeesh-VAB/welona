import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminProductUpdateSchema } from '@shared/schemas/admin-products';
import { toAdminProduct, productAdminInclude } from '@/lib/admin-product-mapper';

interface RouteContext {
  params: { id: string };
}

export const PUT = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  const body = await parseBody(req, adminProductUpdateSchema);

  try {
    const row = await db.product.update({
      where: { id: params.id },
      data: {
        ...(body.sku !== undefined && { sku: body.sku }),
        ...(body.name !== undefined && { name: body.name }),
        ...(body.brand !== undefined && { brand: body.brand ?? null }),
        ...(body.categoryId !== undefined && { categoryId: body.categoryId ?? null }),
        ...(body.hsnSacCode !== undefined && { hsnSacCode: body.hsnSacCode ?? null }),
        ...(body.uom !== undefined && { uom: body.uom }),
        ...(body.barcode !== undefined && { barcode: body.barcode ?? null }),
        ...(body.description !== undefined && { description: body.description ?? null }),
        ...(body.mrp !== undefined && { mrp: body.mrp }),
        ...(body.salePrice !== undefined && { salePrice: body.salePrice }),
        ...(body.purchasePrice !== undefined && { purchasePrice: body.purchasePrice }),
        ...(body.taxPercent !== undefined && { taxPercent: body.taxPercent }),
        ...(body.taxType !== undefined && { taxType: body.taxType }),
        ...(body.reorderLevel !== undefined && { reorderLevel: body.reorderLevel }),
        ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
        ...(body.trackBatches !== undefined && { trackBatches: body.trackBatches }),
        ...(body.trackExpiry !== undefined && { trackExpiry: body.trackExpiry }),
        ...(body.hasComplementary !== undefined && { hasComplementary: body.hasComplementary }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
      include: productAdminInclude,
    });
    return ok(toAdminProduct(row));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') throw Errors.notFound('Product');
      if (error.code === 'P2002') {
        throw Errors.conflict('A product with this SKU already exists.');
      }
    }
    throw error;
  }
});

export const DELETE = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  try {
    await db.product.delete({ where: { id: params.id } });
    return ok({ deleted: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') throw Errors.notFound('Product');
      if (error.code === 'P2003') {
        throw Errors.conflict(
          'This product has stock or movements logged against it and cannot be deleted. Mark it inactive instead.',
        );
      }
    }
    throw error;
  }
});
