import type { AdminEmployee } from './admin-employee';
import type { AdminAttendance, AdminAttendanceSummary } from './admin-attendance';
import type { AdminLeaveApplication, AdminLeaveBalanceReport } from './admin-leave';

/** Detail-page payload for /admin/hr/employee/[id] — one round trip. */
export interface AdminEmployeeProfile {
  employee: AdminEmployee;
  attendance: {
    summary: AdminAttendanceSummary;
    recent: AdminAttendance[];
  };
  leave: {
    balances: AdminLeaveBalanceReport;
    recent: AdminLeaveApplication[];
  };
}
