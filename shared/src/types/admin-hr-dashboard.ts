export interface HrDashboardKpis {
  totalEmployees: number;
  activeEmployees: number;
  newJoinersLast30d: number;
  relievedLast30d: number;
  presentToday: number;
  absentToday: number;
  onLeaveToday: number;
  pendingLeaveApplications: number;
  upcomingHolidays: number;
}

export interface HrDashboardBucket {
  key: string;
  label: string;
  count: number;
}

export interface HrUpcomingPerson {
  id: string;
  name: string;
  employeeCode: string;
  date: string;
  daysAway: number;
}

export interface HrAttendanceTrendDay {
  date: string;
  present: number;
  absent: number;
  halfDay: number;
  wfh: number;
  leave: number;
  marked: number;
}

export interface HrPendingLeavePreview {
  id: string;
  employeeName: string;
  employeeCode: string;
  leaveTypeCode: string;
  leaveTypeName: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string | null;
  appliedAt: string;
}

export interface HrDashboardResponse {
  kpis: HrDashboardKpis;
  byDepartment: HrDashboardBucket[];
  byBranch: HrDashboardBucket[];
  byGender: HrDashboardBucket[];
  upcomingBirthdays: HrUpcomingPerson[];
  upcomingAnniversaries: HrUpcomingPerson[];
  recentJoiners: Array<{
    id: string;
    name: string;
    employeeCode: string;
    designation: string | null;
    department: string | null;
    branch: string | null;
    joiningDate: string;
  }>;
  upcomingHolidays: Array<{
    id: string;
    date: string;
    name: string;
    type: string;
  }>;
  todaysAttendance: Array<{ status: string; count: number }>;
  /** Last 14 calendar days, oldest → newest. */
  attendanceTrend: HrAttendanceTrendDay[];
  pendingLeavesPreview: HrPendingLeavePreview[];
}
