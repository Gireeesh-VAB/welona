import type { Prisma } from '@prisma/client';
import type { AdminService } from '@shared/types/admin-service';

export type ServiceWithRelations = Prisma.ServiceGetPayload<{
  include: {
    category: true;
    createdByAdmin: true;
    inventoryItems: { include: { product: true } };
  };
}>;

export function toAdminService(row: ServiceWithRelations): AdminService {
  return {
    id: row.id,
    categoryId: row.categoryId,
    category: row.category ? { id: row.category.id, name: row.category.name } : null,
    name: row.name,
    hsnSacCode: row.hsnSacCode,
    minPrice: row.minPrice,
    maxPrice: row.maxPrice,
    taxPercent: row.taxPercent,
    taxType: row.taxType,
    hasMeasurements: row.hasMeasurements,
    hasComplementary: row.hasComplementary,
    isActive: row.isActive,
    inventoryItems: row.inventoryItems.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      productUom: item.product.uom,
      quantityPerSession: item.quantityPerSession,
      lowStockThreshold: item.lowStockThreshold,
      sortOrder: item.sortOrder,
    })),
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

export const serviceInclude = {
  category: true,
  createdByAdmin: true,
  inventoryItems: { include: { product: true }, orderBy: { sortOrder: 'asc' as const } },
} satisfies Prisma.ServiceInclude;
