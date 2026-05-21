import type { Prisma } from '@prisma/client';
import type { AdminDesignation } from '@/types/admin-designation';

export type DesignationWithRelations = Prisma.DesignationGetPayload<{
  include: { createdByAdmin: true };
}>;

export function toAdminDesignation(row: DesignationWithRelations): AdminDesignation {
  return {
    id: row.id,
    name: row.name,
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
