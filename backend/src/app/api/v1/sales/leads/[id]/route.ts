import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { leadUpdateSchema } from '@shared/schemas/sales';

type Ctx = { params: { id: string } };

const leadInclude = {
  owner: { select: { id: true, name: true } },
  customer: { select: { id: true, name: true } },
  branch: { select: { id: true, name: true } },
  treatment: { select: { id: true, name: true } },
  quotations: { select: { id: true, number: true, status: true, total: true } },
} satisfies Prisma.LeadInclude;

async function loadLead(orgId: string, id: string) {
  const lead = await db.lead.findFirst({ where: { id, orgId }, include: leadInclude });
  if (!lead) throw Errors.notFound('Lead');
  return lead;
}

/** GET /api/v1/sales/leads/[id] — lead detail. */
export const GET = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'sales:read');
  return ok(await loadLead(claims.orgId, params.id));
});

/** PATCH /api/v1/sales/leads/[id] — update lead fields (not status). */
export const PATCH = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'sales:update');
  await loadLead(claims.orgId, params.id);
  const body = await parseBody(req, leadUpdateSchema);

  if (body.ownerStaffId) {
    const owner = await db.staff.findFirst({
      where: { id: body.ownerStaffId, orgId: claims.orgId },
    });
    if (!owner) throw Errors.badRequest('Selected salesperson does not exist');
  }

  const data: Prisma.LeadUpdateInput = {};
  if (body.contactName !== undefined) data.contactName = body.contactName;
  if (body.contactPhone !== undefined) data.contactPhone = body.contactPhone || null;
  if (body.contactEmail !== undefined) data.contactEmail = body.contactEmail || null;
  if (body.source !== undefined) data.source = body.source;
  if (body.interest !== undefined) data.interest = body.interest || null;
  if (body.gender !== undefined) data.gender = body.gender ?? null;
  if (body.enquiryType !== undefined) data.enquiryType = body.enquiryType || null;
  if (body.media !== undefined) data.media = body.media || null;
  if (body.callType !== undefined) data.callType = body.callType || null;
  if (body.healthStatus !== undefined) data.healthStatus = body.healthStatus || null;
  if (body.leadTransfer !== undefined) data.leadTransfer = body.leadTransfer;
  if (body.estimatedValue !== undefined) data.estimatedValue = body.estimatedValue ?? null;
  if (body.notes !== undefined) data.notes = body.notes || null;
  if (body.ownerStaffId !== undefined) data.owner = { connect: { id: body.ownerStaffId } };
  if (body.customerId !== undefined) {
    data.customer = body.customerId
      ? { connect: { id: body.customerId } }
      : { disconnect: true };
  }
  if (body.treatmentId !== undefined) {
    data.treatment = body.treatmentId
      ? { connect: { id: body.treatmentId } }
      : { disconnect: true };
  }
  if (body.branchId !== undefined) {
    data.branch = body.branchId ? { connect: { id: body.branchId } } : { disconnect: true };
  }

  const updated = await db.lead.update({
    where: { id: params.id },
    data,
    include: leadInclude,
  });
  return ok(updated);
});
