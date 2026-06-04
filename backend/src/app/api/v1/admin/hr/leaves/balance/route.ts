import { db } from '@/lib/db';
import { route, parseQuery } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminOrBranchAuth } from '@/lib/auth/service';
import { adminLeaveBalanceQuerySchema } from '@shared/schemas/admin-leaves';
import type { AdminLeaveBalanceReport, AdminLeaveBalanceRow } from '@shared/types/admin-leave';

/**
 * GET /api/v1/admin/hr/leaves/balance?employeeId&year — full balance ledger
 * for an employee. We union the active LeaveType list with the stored
 * LeaveBalance rows so a type without a row yet still appears (allocated
 * defaults to the type's `daysPerYear`).
 */
export const GET = route(async (req) => {
  const { branchScope } = requireAdminOrBranchAuth(req);
  const { employeeId, year: yearInput } = parseQuery(req, adminLeaveBalanceQuerySchema);
  const year = yearInput ?? new Date().getUTCFullYear();

  // Branch sessions may only inspect employees in their own branch. Use a 404
  // (not 403) on a cross-branch id so existence isn't leaked.
  const employee = await db.employee.findFirst({
    where: { id: employeeId, ...(branchScope && { branchId: branchScope }) },
  });
  if (!employee) throw Errors.notFound('Employee');

  const [types, balances, pendingRows] = await Promise.all([
    db.leaveType.findMany({ where: { isActive: true } }),
    db.leaveBalance.findMany({ where: { employeeId, year } }),
    db.leaveApplication.groupBy({
      by: ['leaveTypeId'],
      where: { employeeId, status: 'pending' },
      _sum: { days: true },
    }),
  ]);

  const balanceMap = new Map(balances.map((b) => [b.leaveTypeId, b]));
  const pendingMap = new Map(
    pendingRows.map((p) => [p.leaveTypeId, p._sum.days ?? 0]),
  );

  const rows: AdminLeaveBalanceRow[] = types.map((t) => {
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

  const response: AdminLeaveBalanceReport = { employeeId, year, rows };
  return ok(response);
});
