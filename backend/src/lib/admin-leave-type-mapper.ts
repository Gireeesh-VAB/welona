import type { Prisma } from '@prisma/client';
import type { AdminLeaveType } from '@shared/types/admin-leave-type';

export type LeaveTypeWithRelations = Prisma.LeaveTypeGetPayload<{
  include: { createdByAdmin: true };
}>;

export function toAdminLeaveType(row: LeaveTypeWithRelations): AdminLeaveType {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    daysPerYear: row.daysPerYear,
    paid: row.paid,
    description: row.description,
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
