import type { Prisma } from '@prisma/client';
import type { AdminAttendance } from '@shared/types/admin-attendance';
import type { AttendanceStatus } from '@shared/enums';

export type AttendanceWithRelations = Prisma.AttendanceGetPayload<{
  include: {
    employee: {
      include: { branch: true; department: true; designation: true };
    };
    markedByAdmin: true;
  };
}>;

export function toAdminAttendance(row: AttendanceWithRelations): AdminAttendance {
  return {
    id: row.id,
    employee: {
      id: row.employee.id,
      name: row.employee.name,
      employeeCode: row.employee.employeeCode,
      branchId: row.employee.branchId,
      branchName: row.employee.branch?.name ?? null,
      departmentName: row.employee.department?.name ?? null,
      designationName: row.employee.designation?.name ?? null,
    },
    date: row.date.toISOString(),
    status: row.status as AttendanceStatus,
    checkIn: row.checkIn ? row.checkIn.toISOString() : null,
    checkOut: row.checkOut ? row.checkOut.toISOString() : null,
    hoursWorked: row.hoursWorked,
    remarks: row.remarks,
    markedBy: row.markedByAdmin
      ? {
          id: row.markedByAdmin.id,
          name: row.markedByAdmin.name,
          email: row.markedByAdmin.email,
        }
      : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
