import type { Prisma } from '@prisma/client';
import type { AdminTax } from '@shared/types/admin-tax';

export type TaxWithRelations = Prisma.TaxGetPayload<{
  include: { createdByAdmin: true };
}>;

export function toAdminTax(row: TaxWithRelations): AdminTax {
  return {
    id: row.id,
    name: row.name,
    percentBps: row.percentBps,
    remarks: row.remarks,
    ipAddress: row.ipAddress,
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
