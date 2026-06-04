import type { AttendanceStatus } from '../enums';

export interface AdminAttendance {
  id: string;
  employee: {
    id: string;
    name: string;
    employeeCode: string;
    branchId: string | null;
    branchName: string | null;
    departmentName: string | null;
    designationName: string | null;
  };
  date: string;
  status: AttendanceStatus;
  checkIn: string | null;
  checkOut: string | null;
  hoursWorked: number | null;
  remarks: string | null;
  markedBy: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}

/** Per-employee monthly roll-up returned by the dashboard / profile views. */
export interface AdminAttendanceSummary {
  employeeId: string;
  year: number;
  month: number;
  present: number;
  absent: number;
  halfDay: number;
  wfh: number;
  leave: number;
  holiday: number;
  workingDays: number;
}
