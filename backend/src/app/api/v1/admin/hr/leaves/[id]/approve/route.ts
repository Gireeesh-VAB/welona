import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminLeaveDecisionSchema } from '@shared/schemas/admin-leaves';
import { toAdminLeaveApplication } from '@/lib/admin-leave-mapper';
import { consumeBalance, paintLeaveAttendance } from '@/lib/hr-leave-service';

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
 * POST /api/v1/admin/hr/leaves/[id]/approve — move pending → approved.
 *
 * Side effects on approval:
 *  - bumps `LeaveBalance.used` by `application.days`
 *  - paints the date range on the Attendance table as `status: 'leave'`
 */
export const POST = route<RouteContext>(async (req, { params }) => {
  const claims = requireAdminAuth(req);
  const body = await parseBody(req, adminLeaveDecisionSchema);

  const row = await db.$transaction(async (tx) => {
    const existing = await tx.leaveApplication.findUnique({ where: { id: params.id } });
    if (!existing) throw Errors.notFound('Leave application');
    if (existing.status !== 'pending') {
      throw Errors.conflict(`Only pending applications can be approved (current: ${existing.status}).`);
    }

    await consumeBalance(
      tx,
      existing.employeeId,
      existing.leaveTypeId,
      existing.fromDate,
      existing.days,
    );
    await paintLeaveAttendance(
      tx,
      existing.employeeId,
      existing.fromDate,
      existing.toDate,
      existing.reason,
    );

    return tx.leaveApplication.update({
      where: { id: params.id },
      data: {
        status: 'approved',
        approverNote: body.approverNote ?? null,
        approvedByAdminId: claims.sub,
        approvedAt: new Date(),
      },
      include,
    });
  });

  return ok(toAdminLeaveApplication(row));
});
