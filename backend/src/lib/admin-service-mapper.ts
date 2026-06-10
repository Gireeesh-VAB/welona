import type { Prisma } from '@prisma/client';
import type { AdminService } from '@shared/types/admin-service';

export type ServiceWithRelations = Prisma.ServiceGetPayload<{
  include: { category: true; createdByAdmin: true };
}>;

export function toAdminService(row: ServiceWithRelations): AdminService {
  return {
    id: row.id,
    categoryId: row.categoryId,
    category: { id: row.category.id, name: row.category.name },
    name: row.name,
    hsnSacCode: row.hsnSacCode,
    minPrice: row.minPrice,
    maxPrice: row.maxPrice,
    taxPercent: row.taxPercent,
    taxType: row.taxType,
    hasMeasurements: row.hasMeasurements,
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
