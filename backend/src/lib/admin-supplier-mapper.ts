import type { Prisma } from '@prisma/client';
import type { AdminSupplier } from '@shared/types/admin-supplier';

export type SupplierWithRelations = Prisma.SupplierGetPayload<{
  include: { createdByAdmin: true };
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
