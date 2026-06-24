import type { Prisma } from '@prisma/client';
import type { AdminSupplier } from '@shared/types/admin-supplier';

export type SupplierWithRelations = Prisma.SupplierGetPayload<{
  include: {
    createdByAdmin: true;
    _count: { select: { supplierProducts: true } };
    supplierProducts: { select: { productId: true; isActive: true; unitPrice: true } };
  };
}>;

export function toAdminSupplier(row: SupplierWithRelations): AdminSupplier {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    contactPerson: row.contactPerson,
    phone: row.phone,
    email: row.email,
    gstin: row.gstin,
    address: row.address,
    paymentTerms: row.paymentTerms,
    deliveryLeadTime: (row as any).deliveryLeadTime ?? null,
    rating: (row as any).rating ?? null,
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
    products: [],
    productCount: row._count?.supplierProducts ?? 0,
    productIds: (row.supplierProducts ?? [])
      .filter((sp) => sp.isActive)
      .map((sp) => sp.productId),
    productPrices: (row.supplierProducts ?? [])
      .filter((sp) => sp.isActive)
      .map((sp) => ({ productId: sp.productId, unitPrice: sp.unitPrice })),
  };
}
