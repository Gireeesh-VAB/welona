/** A role option for the staff assignment dropdown. */
export interface RoleOption {
  id: string;
  name: string;
  scope: string;
}

/** A branch option for the staff assignment dropdown. */
export interface BranchOption {
  id: string;
  name: string;
}

/** An employee / staff member in the organisation directory. */
export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  status: string;
  twoFactorEnabled: boolean;
  roleName: string;
  branchName: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  // HR / employment details
  employeeCode: string | null;
  designation: string | null;
  dateOfJoining: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  emergencyContact: string | null;
  weeklyOff: string | null;
  shiftStart: string | null;
  shiftEnd: string | null;
  bankName: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  salary: number | null;
}
