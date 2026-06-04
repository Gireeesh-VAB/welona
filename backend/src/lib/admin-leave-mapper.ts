import type { Prisma } from '@prisma/client';
import type { AdminLeaveApplication } from '@shared/types/admin-leave';
import type { LeaveApplicationStatus } from '@shared/enums';

export type LeaveApplicationWithRelations = Prisma.LeaveApplicationGetPayload<{
  include: {
    employee: { include: { branch: true; department: true } };
    leaveType: true;
    approvedByAdmin: true;
    appliedByAdmin: true;
  };
}>;

export function toAdminLeaveApplication(
  row: LeaveApplicationWithRelations,
): AdminLeaveApplication {
  return {
    id: row.id,
    employee: {
      id: row.employee.id,
      name: row.employee.name,
      employeeCode: row.employee.employeeCode,
      branchName: row.employee.branch?.name ?? null,
      departmentName: row.employee.department?.name ?? null,
    },
    leaveType: {
      id: row.leaveType.id,
      name: row.leaveType.name,
      code: row.leaveType.code,
      paid: row.leaveType.paid,
    },
    fromDate: row.fromDate.toISOString(),
    toDate: row.toDate.toISOString(),
    days: row.days,
    reason: row.reason,
    status: row.status as LeaveApplicationStatus,
    approverNote: row.approverNote,
    approvedBy: row.approvedByAdmin
      ? {
          id: row.approvedByAdmin.id,
          name: row.approvedByAdmin.name,
          email: row.approvedByAdmin.email,
        }
      : null,
    approvedAt: row.approvedAt ? row.approvedAt.toISOString() : null,
    appliedBy: row.appliedByAdmin
      ? {
          id: row.appliedByAdmin.id,
          name: row.appliedByAdmin.name,
          email: row.appliedByAdmin.email,
        }
      : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
