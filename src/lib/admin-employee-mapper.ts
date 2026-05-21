import type { Prisma } from '@prisma/client';
import type { AdminEmployee } from '@/types/admin-employee';

export type EmployeeWithRelations = Prisma.EmployeeGetPayload<{
  include: {
    designation: true;
    department: true;
    branch: true;
    zone: true;
    createdByAdmin: true;
  };
}>;

export function toAdminEmployee(row: EmployeeWithRelations): AdminEmployee {
  return {
    id: row.id,
    name: row.name,
    biometricId: row.biometricId,
    fatherName: row.fatherName,
    gender: row.gender,
    dob: row.dob ? row.dob.toISOString() : null,
    mobileNo: row.mobileNo,
    mobileAlternate: row.mobileAlternate,
    email: row.email,
    panNo: row.panNo,
    pincode: row.pincode,
    address: row.address,
    employeeCode: row.employeeCode,
    designation: row.designation
      ? { id: row.designation.id, name: row.designation.name }
      : null,
    department: row.department
      ? { id: row.department.id, name: row.department.name }
      : null,
    branch: row.branch
      ? { id: row.branch.id, name: row.branch.name, code: row.branch.code }
      : null,
    zone: row.zone ? { id: row.zone.id, stateName: row.zone.stateName } : null,
    joiningDate: row.joiningDate.toISOString(),
    relievingDate: row.relievingDate ? row.relievingDate.toISOString() : null,
    salary: row.salary,
    bankName: row.bankName,
    bankAccountNo: row.bankAccountNo,
    callerType: row.callerType,
    pf: row.pf,
    esi: row.esi,
    weeklyOff: row.weeklyOff,
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
