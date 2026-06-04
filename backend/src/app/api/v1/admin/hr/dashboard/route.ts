import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { requireAdminOrBranchAuth } from '@/lib/auth/service';
import { shiftDay, startOfToday } from '@/lib/hr-dates';
import type {
  HrAttendanceTrendDay,
  HrDashboardResponse,
} from '@shared/types/admin-hr-dashboard';

/**
 * GET /api/v1/admin/hr/dashboard — KPIs + breakdowns for the HR home page.
 *
 * Computed live (no cache) — read counts dominate cost, the panel is rarely
 * loaded relative to the rest of the app.
 */
export const GET = route(async (req) => {
  const { branchScope } = requireAdminOrBranchAuth(req);

  // Branch sessions see only their own branch. Employee queries filter on
  // `branchId` directly; attendance/leave reach the branch via the employee
  // relation. (Holiday/LeaveType/Department are org-wide — left unscoped.)
  const empBranch: Prisma.EmployeeWhereInput = branchScope ? { branchId: branchScope } : {};
  const attViaEmployee: Prisma.AttendanceWhereInput = branchScope
    ? { employee: { branchId: branchScope } }
    : {};
  const leaveViaEmployee: Prisma.LeaveApplicationWhereInput = branchScope
    ? { employee: { branchId: branchScope } }
    : {};

  const today = startOfToday();
  const tomorrow = shiftDay(1, today);
  const thirtyDaysAgo = shiftDay(-30, today);
  const fourteenDaysAgo = shiftDay(-13, today);
  const sixtyDaysAhead = shiftDay(60, today);

  const [
    totalEmployees,
    activeEmployees,
    newJoinersLast30d,
    relievedLast30d,
    pendingLeaveApplications,
    onLeaveTodayRows,
    todayAttendanceRows,
    employees,
    upcomingHolidaysRows,
  ] = await Promise.all([
    db.employee.count({ where: { ...empBranch } }),
    db.employee.count({ where: { isActive: true, ...empBranch } }),
    db.employee.count({ where: { joiningDate: { gte: thirtyDaysAgo }, ...empBranch } }),
    db.employee.count({
      where: {
        relievingDate: { gte: thirtyDaysAgo, lt: tomorrow },
        ...empBranch,
      },
    }),
    db.leaveApplication.count({ where: { status: 'pending', ...leaveViaEmployee } }),
    db.leaveApplication.findMany({
      where: {
        status: 'approved',
        fromDate: { lte: today },
        toDate: { gte: today },
        ...leaveViaEmployee,
      },
      select: { employeeId: true },
    }),
    db.attendance.groupBy({
      by: ['status'],
      where: { date: today, ...attViaEmployee },
      _count: { _all: true },
    }),
    db.employee.findMany({
      where: { isActive: true, ...empBranch },
      select: {
        id: true,
        name: true,
        employeeCode: true,
        gender: true,
        dob: true,
        joiningDate: true,
        designation: { select: { name: true } },
        department: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
      },
    }),
    db.holiday.findMany({
      where: { isActive: true, date: { gte: today, lt: sixtyDaysAhead } },
      orderBy: { date: 'asc' },
      take: 10,
    }),
  ]);

  // Last 14 days of attendance — one query, bucketed below by (date, status).
  const trendRows = await db.attendance.findMany({
    where: { date: { gte: fourteenDaysAgo, lt: tomorrow }, ...attViaEmployee },
    select: { date: true, status: true },
  });

  const pendingPreviewRows = await db.leaveApplication.findMany({
    where: { status: 'pending', ...leaveViaEmployee },
    orderBy: { createdAt: 'asc' },
    take: 5,
    include: {
      employee: { select: { name: true, employeeCode: true } },
      leaveType: { select: { name: true, code: true } },
    },
  });

  const onLeaveToday = new Set(onLeaveTodayRows.map((r) => r.employeeId)).size;

  const todayMap = new Map(todayAttendanceRows.map((r) => [r.status, r._count._all]));
  const presentToday =
    (todayMap.get('present') ?? 0) + (todayMap.get('half_day') ?? 0) + (todayMap.get('wfh') ?? 0);
  const absentToday = todayMap.get('absent') ?? 0;

  // ----- Breakdowns -----
  const byDepartmentMap = new Map<string, { id: string; name: string; count: number }>();
  const byBranchMap = new Map<string, { id: string; name: string; count: number }>();
  const byGenderMap = new Map<string, number>();
  for (const e of employees) {
    if (e.department) {
      const cur = byDepartmentMap.get(e.department.id);
      byDepartmentMap.set(
        e.department.id,
        cur
          ? { ...cur, count: cur.count + 1 }
          : { id: e.department.id, name: e.department.name, count: 1 },
      );
    }
    if (e.branch) {
      const cur = byBranchMap.get(e.branch.id);
      byBranchMap.set(
        e.branch.id,
        cur
          ? { ...cur, count: cur.count + 1 }
          : { id: e.branch.id, name: e.branch.name, count: 1 },
      );
    }
    const g = (e.gender ?? 'unknown').toLowerCase();
    byGenderMap.set(g, (byGenderMap.get(g) ?? 0) + 1);
  }

  // ----- Upcoming birthdays / work anniversaries (next 30 days) -----
  const upcoming = (kind: 'birthday' | 'anniversary') => {
    const items: { id: string; name: string; employeeCode: string; date: string; daysAway: number }[] = [];
    for (const e of employees) {
      const ref = kind === 'birthday' ? e.dob : e.joiningDate;
      if (!ref) continue;
      const refDate = new Date(ref);
      const thisYear = today.getUTCFullYear();
      let next = new Date(Date.UTC(thisYear, refDate.getUTCMonth(), refDate.getUTCDate()));
      if (next < today) {
        next = new Date(Date.UTC(thisYear + 1, refDate.getUTCMonth(), refDate.getUTCDate()));
      }
      const daysAway = Math.floor((next.getTime() - today.getTime()) / 86_400_000);
      if (daysAway <= 30) {
        items.push({
          id: e.id,
          name: e.name,
          employeeCode: e.employeeCode,
          date: next.toISOString(),
          daysAway,
        });
      }
    }
    return items.sort((a, b) => a.daysAway - b.daysAway).slice(0, 10);
  };

  // ----- Recent joiners -----
  const recentJoinerRows = await db.employee.findMany({
    where: { joiningDate: { gte: thirtyDaysAgo }, ...empBranch },
    orderBy: { joiningDate: 'desc' },
    take: 10,
    include: {
      designation: true,
      department: true,
      branch: true,
    },
  });

  const response: HrDashboardResponse = {
    kpis: {
      totalEmployees,
      activeEmployees,
      newJoinersLast30d,
      relievedLast30d,
      presentToday,
      absentToday,
      onLeaveToday,
      pendingLeaveApplications,
      upcomingHolidays: upcomingHolidaysRows.length,
    },
    byDepartment: Array.from(byDepartmentMap.values())
      .sort((a, b) => b.count - a.count)
      .map((d) => ({ key: d.id, label: d.name, count: d.count })),
    byBranch: Array.from(byBranchMap.values())
      .sort((a, b) => b.count - a.count)
      .map((d) => ({ key: d.id, label: d.name, count: d.count })),
    byGender: Array.from(byGenderMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => ({
        key,
        label: key.charAt(0).toUpperCase() + key.slice(1),
        count,
      })),
    upcomingBirthdays: upcoming('birthday'),
    upcomingAnniversaries: upcoming('anniversary'),
    recentJoiners: recentJoinerRows.map((r) => ({
      id: r.id,
      name: r.name,
      employeeCode: r.employeeCode,
      designation: r.designation?.name ?? null,
      department: r.department?.name ?? null,
      branch: r.branch?.name ?? null,
      joiningDate: r.joiningDate.toISOString(),
    })),
    upcomingHolidays: upcomingHolidaysRows.map((h) => ({
      id: h.id,
      date: h.date.toISOString(),
      name: h.name,
      type: h.type,
    })),
    todaysAttendance: Array.from(todayMap.entries()).map(([status, count]) => ({
      status,
      count,
    })),
    attendanceTrend: buildTrend(trendRows, fourteenDaysAgo, today),
    pendingLeavesPreview: pendingPreviewRows.map((row) => ({
      id: row.id,
      employeeName: row.employee.name,
      employeeCode: row.employee.employeeCode,
      leaveTypeCode: row.leaveType.code,
      leaveTypeName: row.leaveType.name,
      fromDate: row.fromDate.toISOString(),
      toDate: row.toDate.toISOString(),
      days: row.days,
      reason: row.reason,
      appliedAt: row.createdAt.toISOString(),
    })),
  };

  return ok(response);
});

/**
 * Pivot a flat list of `{date, status}` rows into one bucket per calendar
 * day for the requested 14-day window — including empty days the table has
 * no rows for, so the line chart renders a continuous x-axis.
 */
function buildTrend(
  rows: Array<{ date: Date; status: string }>,
  from: Date,
  to: Date,
): HrAttendanceTrendDay[] {
  const buckets = new Map<string, HrAttendanceTrendDay>();
  for (let d = new Date(from); d <= to; d = new Date(d.getTime() + 86_400_000)) {
    const key = d.toISOString();
    buckets.set(key, {
      date: key,
      present: 0,
      absent: 0,
      halfDay: 0,
      wfh: 0,
      leave: 0,
      marked: 0,
    });
  }
  for (const r of rows) {
    const key = r.date.toISOString();
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.marked += 1;
    if (r.status === 'present') bucket.present += 1;
    else if (r.status === 'absent') bucket.absent += 1;
    else if (r.status === 'half_day') bucket.halfDay += 1;
    else if (r.status === 'wfh') bucket.wfh += 1;
    else if (r.status === 'leave') bucket.leave += 1;
  }
  return Array.from(buckets.values());
}
