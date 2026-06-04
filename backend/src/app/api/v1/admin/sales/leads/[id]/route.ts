import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminOrBranchAuth } from '@/lib/auth/service';
import { resolveOrgId } from '@/lib/org';
import { leadUpdateSchema } from '@shared/schemas/sales';

type Ctx = { params: { id: string } };

const leadInclude = {
  owner: { select: { id: true, name: true } },
  customer: { select: { id: true, name: true } },
  branch: { select: { id: true, name: true } },
  treatment: { select: { id: true, name: true } },
  quotations: { select: { id: true, number: true, status: true, total: true } },
} satisfies Prisma.LeadInclude;

async function loadLead(orgId: string, id: string, branchScope: string | null) {
  const lead = await db.lead.findFirst({
    where: { id, orgId, ...(branchScope && { branchId: branchScope }) },
    include: leadInclude,
  });
  if (!lead) throw Errors.notFound('Lead');
  return lead;
}

/** GET /api/v1/admin/sales/leads/[id] — lead detail. */
export const GET = route<Ctx>(async (req, { params }) => {
  const { branchScope } = requireAdminOrBranchAuth(req);
  const orgId = await resolveOrgId();
  return ok(await loadLead(orgId, params.id, branchScope));
});

/** PATCH /api/v1/admin/sales/leads/[id] — update lead fields (not status). */
export const PATCH = route<Ctx>(async (req, { params }) => {
  const { branchScope } = requireAdminOrBranchAuth(req);
  const orgId = await resolveOrgId();
  await loadLead(orgId, params.id, branchScope);
  const body = await parseBody(req, leadUpdateSchema);

  if (body.ownerStaffId) {
    const owner = await db.staff.findFirst({
      where: { id: body.ownerStaffId, orgId, ...(branchScope && { branchId: branchScope }) },
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
