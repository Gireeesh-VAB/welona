import { db } from '@/lib/db';
import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { toAdminLeaveApplication } from '@/lib/admin-leave-mapper';
import { clearLeaveAttendance, releaseBalance } from '@/lib/hr-leave-service';

interface RouteContext {
  params: { id: string };
}

const include = {
  employee: { include: { branch: true, department: true } },
  leaveType: true,
  approvedByAdmin: true,
  appliedByAdmin: true,
} as const;

/**
 * POST /api/v1/admin/hr/leaves/[id]/cancel — cancel a pending OR approved
 * leave. If it was approved we also reverse the balance consumption and
 * wipe the painted attendance cells so the employee's record is consistent.
 */
export const POST = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);

  const row = await db.$transaction(async (tx) => {
    const existing = await tx.leaveApplication.findUnique({ where: { id: params.id } });
    if (!existing) throw Errors.notFound('Leave application');
    if (existing.status === 'cancelled' || existing.status === 'rejected') {
      throw Errors.conflict(`Cannot cancel a ${existing.status} application.`);
    }

    if (existing.status === 'approved') {
      await releaseBalance(
        tx,
        existing.employeeId,
        existing.leaveTypeId,
        existing.fromDate,
        existing.days,
      );
      await clearLeaveAttendance(tx, existing.employeeId, existing.fromDate, existing.toDate);
    }

    return tx.leaveApplication.update({
      where: { id: params.id },
      data: { status: 'cancelled' },
      include,
    });
  });

  return ok(toAdminLeaveApplication(row));
});
