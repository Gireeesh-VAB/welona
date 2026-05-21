import type { Prisma } from '@prisma/client';
import type { AdminSystemUser } from '@/types/admin-system-user';

export type SystemUserWithRelations = Prisma.SystemUserGetPayload<{
  include: { branch: true; employee: true; createdByAdmin: true };
}>;

export function toAdminSystemUser(row: SystemUserWithRelations): AdminSystemUser {
  return {
    id: row.id,
    userName: row.userName,
    email: row.email,
    branch: row.branch
      ? { id: row.branch.id, name: row.branch.name, code: row.branch.code }
      : null,
    employee: row.employee
      ? {
          id: row.employee.id,
          name: row.employee.name,
          employeeCode: row.employee.employeeCode,
        }
      : null,
    isActive: row.isActive,
    ipAddress: row.ipAddress,
    lastLoginAt: row.lastLoginAt ? row.lastLoginAt.toISOString() : null,
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
