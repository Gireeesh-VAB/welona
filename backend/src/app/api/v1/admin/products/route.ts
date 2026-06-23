import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import {
  adminProductCreateSchema,
  adminProductListQuerySchema,
} from '@shared/schemas/admin-products';
import { toAdminProduct, productAdminInclude } from '@/lib/admin-product-mapper';
import { readClientIp } from '@/lib/client-ip';

export const GET = route(async (req) => {
  // Org-wide reference data; branch sessions read it. Writes stay admin-only.
  requireAdminAuth(req);
  const { search, categoryId, isActive, page, limit } = parseQuery(
    req,
    adminProductListQuerySchema,
  );

  const where: Prisma.ProductWhereInput = {
    ...(categoryId && { categoryId }),
    ...(isActive !== undefined && { isActive }),
    ...(search && {
      OR: [
        { name: { contains: search } },
        { sku: { contains: search } },
        { brand: { contains: search } },
        { barcode: { contains: search } },
        { hsnSacCode: { contains: search } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    db.product.findMany({
      where,
      include: productAdminInclude,
      orderBy: [{ name: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.product.count({ where }),
  ]);

  return ok(items.map(toAdminProduct), buildMeta(page, limit, total));
});

export const POST = route(async (req) => {
  const claims = requireAdminAuth(req);
  const body = await parseBody(req, adminProductCreateSchema);
  const ip = readClientIp(req);

  try {
    const row = await db.product.create({
      data: {
        sku: body.sku,
        name: body.name,
        brand: body.brand ?? null,
        categoryId: body.categoryId ?? null,
        hsnSacCode: body.hsnSacCode ?? null,
        uom: body.uom,
        barcode: body.barcode ?? null,
        description: body.description ?? null,
        mrp: body.mrp,
        salePrice: body.salePrice,
        purchasePrice: body.purchasePrice,
        taxPercent: body.taxPercent,
        taxType: body.taxType,
        reorderLevel: body.reorderLevel,
        imageUrl: body.imageUrl ?? null,
        trackBatches: body.trackBatches,
        trackExpiry: body.trackExpiry,
        hasComplementary: body.hasComplementary,
        consumptionUom: body.consumptionUom ?? null,
        unitsPerPurchase: body.unitsPerPurchase,
        availableForServices: body.availableForServices,
        availableForProducts: body.availableForProducts,
        isActive: body.isActive,
        ipAddress: ip,
        createdByAdminId: claims.sub,
      },
      include: productAdminInclude,
    });
    return created(toAdminProduct(row));
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw Errors.conflict(`A product with SKU "${body.sku}" already exists.`);
    }
    throw error;
  }
});
