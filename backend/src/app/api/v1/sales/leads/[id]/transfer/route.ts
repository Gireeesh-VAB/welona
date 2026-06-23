import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { transferLeadSchema } from '@shared/schemas/sales';

type Ctx = { params: { id: string } };

/** POST /api/v1/sales/leads/[id]/transfer — transfer a lead to another branch. */
export const POST = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'sales:update');

  const source = await db.lead.findFirst({
    where: { id: params.id, orgId: claims.orgId },
    include: { branch: { select: { id: true, name: true } } },
  });
  if (!source) throw Errors.notFound('Lead');

  if (['transferred', 'converted', 'lost'].includes(source.status)) {
    throw Errors.badRequest(`Cannot transfer a lead with status "${source.status}"`);
  }

  const body = await parseBody(req, transferLeadSchema);

  const targetBranch = await db.branch.findFirst({
    where: { id: body.targetBranchId, orgId: claims.orgId, isActive: true },
    select: { id: true, name: true },
  });
  if (!targetBranch) throw Errors.badRequest('Target branch not found');

  if (body.targetOwnerStaffId) {
    const owner = await db.staff.findFirst({
      where: { id: body.targetOwnerStaffId, orgId: claims.orgId },
    });
    if (!owner) throw Errors.badRequest('Selected staff does not exist');
  }

  const result = await db.$transaction(async (tx) => {
    const newLead = await tx.lead.create({
      data: {
        orgId:             claims.orgId,
        branchId:          body.targetBranchId,
        contactName:       source.contactName,
        contactPhone:      source.contactPhone,
        contactEmail:      source.contactEmail,
        gender:            source.gender,
        treatmentId:       source.treatmentId,
        source:            source.source,
        enquiryType:       source.enquiryType,
        media:             source.media,
        callType:          source.callType,
        healthStatus:      source.healthStatus,
        estimatedValue:    source.estimatedValue,
        status:            'new',
        leadTransfer:      true,
        transferredFromId: source.id,
        transferNotes:     body.notes ?? null,
        ownerStaffId:      body.targetOwnerStaffId ?? source.ownerStaffId,
      },
    });

    await tx.lead.update({
      where: { id: source.id },
      data: {
        status:         'transferred',
        leadTransfer:   true,
        transferredToId: newLead.id,
        transferredAt:  new Date(),
      },
    });

    return newLead;
  });

  return ok({ newLeadId: result.id, transferredAt: new Date().toISOString() });
});
