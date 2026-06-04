import { db } from '@/lib/db';
import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminOrBranchAuth } from '@/lib/auth/service';
import { toAdminEmployee } from '@/lib/admin-employee-mapper';
import { toAdminAttendance } from '@/lib/admin-attendance-mapper';
import { toAdminLeaveApplication } from '@/lib/admin-leave-mapper';
import { startOfMonth, startOfNextMonth } from '@/lib/hr-dates';
import type { AdminEmployeeProfile } from '@shared/types/admin-employee-profile';
import type { AdminAttendanceSummary } from '@shared/types/admin-attendance';
import type { AdminLeaveBalanceRow } from '@shared/types/admin-leave';

interface RouteContext {
  params: { id: string };
}

/**
 * GET /api/v1/admin/hr/employees/[id]/profile — one-shot payload for the
 * employee detail page. Returns the employee record, this-month attendance
 * summary + latest 30 entries, and current-year leave balances + recent apps.
 */
export const GET = route<RouteContext>(async (req, { params }) => {
  const { branchScope } = requireAdminOrBranchAuth(req);

  // Branch sessions may only view employees in their own branch (404 on a
  // cross-branch id so existence isn't leaked).
  const employee = await db.employee.findFirst({
    where: { id: params.id, ...(branchScope && { branchId: branchScope }) },
    include: {
      designation: true,
      department: true,
      branch: true,
      zone: true,
      createdByAdmin: true,
    },
  });
  if (!employee) throw Errors.notFound('Employee');

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = startOfNextMonth(now);
  const year = now.getUTCFullYear();

  const [monthRows, recentAttendance, leaveTypes, balances, pendingRows, recentLeaves] =
    await Promise.all([
      db.attendance.findMany({
        where: { employeeId: params.id, date: { gte: monthStart, lt: monthEnd } },
        select: { status: true },
      }),
      db.attendance.findMany({
        where: { employeeId: params.id },
        include: {
          employee: { include: { branch: true, department: true, designation: true } },
          markedByAdmin: true,
        },
        orderBy: { date: 'desc' },
        take: 30,
      }),
      db.leaveType.findMany({ where: { isActive: true } }),
      db.leaveBalance.findMany({ where: { employeeId: params.id, year } }),
      db.leaveApplication.groupBy({
        by: ['leaveTypeId'],
        where: { employeeId: params.id, status: 'pending' },
        _sum: { days: true },
      }),
      db.leaveApplication.findMany({
        where: { employeeId: params.id },
        include: {
          employee: { include: { branch: true, department: true } },
          leaveType: true,
          approvedByAdmin: true,
          appliedByAdmin: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

  const summary: AdminAttendanceSummary = {
    employeeId: params.id,
    year,
    month: now.getUTCMonth() + 1,
    present: 0,
    absent: 0,
    halfDay: 0,
    wfh: 0,
    leave: 0,
    holiday: 0,
    workingDays: monthRows.length,
  };
  for (const r of monthRows) {
    if (r.status === 'present') summary.present++;
    else if (r.status === 'absent') summary.absent++;
    else if (r.status === 'half_day') summary.halfDay++;
    else if (r.status === 'wfh') summary.wfh++;
    else if (r.status === 'leave') summary.leave++;
    else if (r.status === 'holiday') summary.holiday++;
  }

  const balanceMap = new Map(balances.map((b) => [b.leaveTypeId, b]));
  const pendingMap = new Map(pendingRows.map((p) => [p.leaveTypeId, p._sum.days ?? 0]));
  const balanceRows: AdminLeaveBalanceRow[] = leaveTypes.map((t) => {
    const stored = balanceMap.get(t.id);
    const allocated = stored?.allocated ?? t.daysPerYear;
    const used = stored?.used ?? 0;
    const pending = pendingMap.get(t.id) ?? 0;
    return {
      leaveType: { id: t.id, name: t.name, code: t.code, paid: t.paid },
      year,
      allocated,
      used,
      pending,
      balance: Math.max(0, allocated - used - pending),
    };
  });

  const response: AdminEmployeeProfile = {
    employee: toAdminEmployee(employee),
    attendance: {
      summary,
      recent: recentAttendance.map(toAdminAttendance),
    },
    leave: {
      balances: { employeeId: params.id, year, rows: balanceRows },
      recent: recentLeaves.map(toAdminLeaveApplication),
    },
  };
  return ok(response);
});
