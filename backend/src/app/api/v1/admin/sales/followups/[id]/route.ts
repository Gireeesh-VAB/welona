import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminOrBranchAuth } from '@/lib/auth/service';
import { resolveOrgId } from '@/lib/org';
import { followUpUpdateSchema } from '@shared/schemas/sales';

type Ctx = { params: { id: string } };

/**
 * PATCH /api/v1/admin/sales/followups/[id] — update a follow-up: mark it
 * completed/cancelled, reschedule it, or edit the note/outcome.
 */
export const PATCH = route<Ctx>(async (req, { params }) => {
  const { branchScope } = requireAdminOrBranchAuth(req);
  const orgId = await resolveOrgId();

  // FollowUp has no branchId column; scope through its parent Lead (or
  // Customer) so branch sessions only reach follow-ups in their branch.
  const followUp = await db.followUp.findFirst({
    where: {
      id: params.id,
      orgId,
      ...(branchScope && {
        OR: [
          { lead: { branchId: branchScope } },
          { customer: { branchId: branchScope } },
        ],
      }),
    },
  });
  if (!followUp) throw Errors.notFound('Follow-up');

  const body = await parseBody(req, followUpUpdateSchema);
  const data: Prisma.FollowUpUpdateInput = {};
  if (body.note !== undefined) data.note = body.note || null;
  if (body.remarks !== undefined) data.remarks = body.remarks || null;
  if (body.contactedAt !== undefined) data.contactedAt = new Date(body.contactedAt);
  if (body.dueAt !== undefined) data.dueAt = new Date(body.dueAt);
  if (body.outcome !== undefined) data.outcome = body.outcome || null;
  if (body.assignedToId !== undefined) data.assignedToId = body.assignedToId || null;
  if (body.status !== undefined) {
    data.status = body.status;
    data.completedAt = body.status === 'completed' ? new Date() : null;
  }

  const updated = await db.followUp.update({ where: { id: params.id }, data });
  return ok(updated);
});
