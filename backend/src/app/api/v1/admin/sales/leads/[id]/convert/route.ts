import { db } from '@/lib/db';
import { route } from '@/lib/api/handler';
import { created } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { resolveOrgId } from '@/lib/org';
import { nextDocumentNumber } from '@/lib/sales/service';

type Ctx = { params: { id: string } };

/**
 * POST /api/v1/admin/sales/leads/[id]/convert — convert a lead into a draft
 * quotation. Creates a customer from the lead's contact details if the lead
 * is not already linked to one, then marks the lead as converted.
 */
export const POST = route<Ctx>(async (req, { params }) => {
  requireAdminAuth(req);
  const orgId = await resolveOrgId();

  const quotation = await db.$transaction(async (tx) => {
    const lead = await tx.lead.findFirst({
      where: { id: params.id, orgId },
    });
    if (!lead) throw Errors.notFound('Lead');
    if (lead.status === 'converted') {
      throw Errors.badRequest('This lead has already been converted');
    }
    if (lead.status === 'lost') {
      throw Errors.badRequest('A lost lead cannot be converted');
    }

    // Ensure the quotation has a customer to attach to.
    let customerId = lead.customerId;
    if (!customerId) {
      const customer = await tx.customer.create({
        data: {
          orgId,
          branchId: lead.branchId,
          type: 'individual',
          name: lead.contactName,
          phone: lead.contactPhone,
          email: lead.contactEmail,
          tags: '[]',
          createdById: null,
        },
      });
      customerId = customer.id;
    }

    const number = await nextDocumentNumber(tx, orgId, 'quotation', 'QT');
    const draft = await tx.quotation.create({
      data: {
        orgId,
        branchId: lead.branchId,
        number,
        customerId,
        leadId: lead.id,
        ownerStaffId: lead.ownerStaffId,
        status: 'draft',
      },
      include: {
        items: true,
        customer: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } },
      },
    });

    await tx.lead.update({
      where: { id: lead.id },
      data: { status: 'converted', customerId },
    });

    return draft;
  });

  return created(quotation);
});
