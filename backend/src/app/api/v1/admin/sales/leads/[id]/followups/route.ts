import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok, created } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { resolveOrgId } from '@/lib/org';
import { followUpCreateSchema } from '@shared/schemas/sales';

type Ctx = { params: { id: string } };

/** GET /api/v1/admin/sales/leads/[id]/followups — follow-ups for an enquiry. */
export const GET = route<Ctx>(async (req, { params }) => {
  requireAdminAuth(req);
  const orgId = await resolveOrgId();

  const lead = await db.lead.findFirst({
    where: { id: params.id, orgId },
  });
  if (!lead) throw Errors.notFound('Enquiry');

  const followUps = await db.followUp.findMany({
    where: { leadId: params.id },
    orderBy: { createdAt: 'desc' },
  });
  return ok(followUps);
});

/** POST /api/v1/admin/sales/leads/[id]/followups — log a follow-up interaction. */
export const POST = route<Ctx>(async (req, { params }) => {
  requireAdminAuth(req);
  const orgId = await resolveOrgId();

  const lead = await db.lead.findFirst({
    where: { id: params.id, orgId },
  });
  if (!lead) throw Errors.notFound('Enquiry');

  const body = await parseBody(req, followUpCreateSchema);
  const status = body.status ?? 'pending';
  const followUp = await db.followUp.create({
    data: {
      orgId,
      leadId: params.id,
      customerId: lead.customerId,
      contactedAt: body.contactedAt ? new Date(body.contactedAt) : null,
      dueAt: body.dueAt ? new Date(body.dueAt) : null,
      note: body.note || null,
      remarks: body.remarks || null,
      status,
      completedAt: status === 'completed' ? new Date() : null,
      outcome: body.outcome ?? null,
      assignedToId: body.assignedToId ?? null,
      createdById: null,
    },
  });
  return created(followUp);
});
