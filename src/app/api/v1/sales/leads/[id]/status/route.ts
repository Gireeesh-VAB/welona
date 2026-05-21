import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { leadStatusSchema } from '@/lib/sales/schemas';
import { LEAD_TRANSITIONS, assertTransition } from '@/lib/sales/transitions';

type Ctx = { params: { id: string } };

/**
 * POST /api/v1/sales/leads/[id]/status — move a lead through its pipeline
 * stage (new → contacted → qualified → …). Illegal jumps are rejected.
 */
export const POST = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'sales:update');
  const body = await parseBody(req, leadStatusSchema);

  const lead = await db.lead.findFirst({ where: { id: params.id, orgId: claims.orgId } });
  if (!lead) throw Errors.notFound('Lead');

  assertTransition(LEAD_TRANSITIONS, lead.status, body.status, 'lead');

  if (body.status === 'lost' && !body.lostReason) {
    throw Errors.badRequest('A reason is required when marking a lead as lost');
  }

  const updated = await db.lead.update({
    where: { id: lead.id },
    data: {
      status: body.status,
      lostReason: body.status === 'lost' ? body.lostReason ?? null : null,
    },
  });
  return ok(updated);
});
