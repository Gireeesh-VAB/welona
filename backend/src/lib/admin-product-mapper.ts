import type { Prisma } from '@prisma/client';
import type { AdminProduct } from '@shared/types/admin-product';
import type { ProductUom } from '@shared/enums';

export type ProductWithRelations = Prisma.ProductGetPayload<{
  include: { category: true; createdByAdmin: true };
}>;

export const productAdminInclude = {
  category: true,
  createdByAdmin: true,
} satisfies Prisma.ProductInclude;

export function toAdminProduct(row: ProductWithRelations): AdminProduct {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    brand: row.brand,
    category: row.category ? { id: row.category.id, name: row.category.name } : null,
    hsnSacCode: row.hsnSacCode,
    uom: row.uom as ProductUom,
    barcode: row.barcode,
    description: row.description,
    mrp: row.mrp,
    salePrice: row.salePrice,
    purchasePrice: row.purchasePrice,
    taxPercent: row.taxPercent,
    taxType: row.taxType,
    reorderLevel: row.reorderLevel,
    imageUrl: row.imageUrl,
    trackBatches: row.trackBatches,
    trackExpiry: row.trackExpiry,
    hasComplementary: row.hasComplementary,
    isActive: row.isActive,
    createdBy: row.createdByAdmin
      ? {
          id: row.createdByAdmin.id,
          name: row.createdByAdmin.name,
          email: row.createdByAdmin.email,
        }
      : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
