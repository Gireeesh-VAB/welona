import type { Prisma } from '@prisma/client';
import type { AdminOffer } from '@/types/admin-offer';

export type MarketingOfferWithRelations = Prisma.MarketingOfferGetPayload<{
  include: {
    createdByAdmin: true;
    branches: { include: { branch: { include: { zone: true } } } };
    items: { include: { category: true; service: true } };
  };
}>;

export function toAdminOffer(row: MarketingOfferWithRelations): AdminOffer {
  return {
    id: row.id,
    packageName: row.packageName,
    packageCode: row.packageCode,
    fromDate: row.fromDate.toISOString(),
    toDate: row.toDate.toISOString(),
    minAmount: row.minAmount,
    maxAmount: row.maxAmount,
    remarks: row.remarks,
    frontImageUrl: row.frontImageUrl,
    isActive: row.isActive,
    branches: row.branches.map((b) => ({
      id: b.branch.id,
      name: b.branch.name,
      code: b.branch.code,
      zone: b.branch.zone
        ? { id: b.branch.zone.id, stateName: b.branch.zone.stateName }
        : null,
    })),
    items: row.items
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((it) => ({
        id: it.id,
        categoryId: it.categoryId,
        categoryName: it.category.name,
        serviceId: it.serviceId,
        serviceName: it.service.name,
        quantity: it.quantity,
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
