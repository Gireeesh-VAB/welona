import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminLeaveDecisionSchema } from '@shared/schemas/admin-leaves';
import { toAdminLeaveApplication } from '@/lib/admin-leave-mapper';

interface RouteContext {
  params: { id: string };
}

const include = {
  employee: { include: { branch: true, department: true } },
  leaveType: true,
  approvedByAdmin: true,
  appliedByAdmin: true,
} as const;

export const POST = route<RouteContext>(async (req, { params }) => {
  const claims = requireAdminAuth(req);
  const body = await parseBody(req, adminLeaveDecisionSchema);

  const existing = await db.leaveApplication.findUnique({ where: { id: params.id } });
  if (!existing) throw Errors.notFound('Leave application');
  if (existing.status !== 'pending') {
    throw Errors.conflict(`Only pending applications can be rejected (current: ${existing.status}).`);
  }

  const row = await db.leaveApplication.update({
    where: { id: params.id },
    data: {
      status: 'rejected',
      approverNote: body.approverNote ?? null,
      approvedByAdminId: claims.sub,
      approvedAt: new Date(),
    },
    include,
  });
  return ok(toAdminLeaveApplication(row));
});
