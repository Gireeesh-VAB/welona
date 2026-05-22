import type { Prisma } from '@prisma/client';
import type { AdminDepartment } from '@shared/types/admin-department';

export type DepartmentWithRelations = Prisma.DepartmentGetPayload<{
  include: { createdByAdmin: true };
}>;

export function toAdminDepartment(row: DepartmentWithRelations): AdminDepartment {
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
