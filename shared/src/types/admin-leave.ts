import type { LeaveApplicationStatus } from '../enums';

export interface AdminLeaveApplication {
  id: string;
  employee: {
    id: string;
    name: string;
    employeeCode: string;
    branchName: string | null;
    departmentName: string | null;
  };
  leaveType: {
    id: string;
    name: string;
    code: string;
    paid: boolean;
  };
  fromDate: string;
  toDate: string;
  days: number;
  reason: string | null;
  status: LeaveApplicationStatus;
  approverNote: string | null;
  approvedBy: { id: string; name: string; email: string } | null;
  approvedAt: string | null;
  appliedBy: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminLeaveBalanceRow {
  leaveType: { id: string; name: string; code: string; paid: boolean };
  year: number;
  allocated: number;
  used: number;
  pending: number;
  balance: number;
}

export interface AdminLeaveBalanceReport {
  employeeId: string;
  year: number;
  rows: AdminLeaveBalanceRow[];
}
