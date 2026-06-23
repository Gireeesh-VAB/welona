import { db } from '@/lib/db';
import { route } from '@/lib/api/handler';
import { created } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { serializeCustomer } from '@/lib/sales/serializers';

type Ctx = { params: { id: string } };

/**
 * POST /api/v1/sales/leads/[id]/convert-customer — promote an enquiry into a
 * dedicated Customer Profile. Creates a customer from the lead's contact
 * details (unless one is already linked), links the lead to it and marks the
 * lead as converted. Returns the customer.
 */
export const POST = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'customers:create');

  const customer = await db.$transaction(async (tx) => {
    const lead = await tx.lead.findFirst({ where: { id: params.id, orgId: claims.orgId } });
    if (!lead) throw Errors.notFound('Enquiry');
    if (lead.status === 'lost') {
      throw Errors.badRequest('A lost enquiry cannot be converted');
    }

    // Reuse the linked customer if the lead already has one.
    let customerId = lead.customerId;
    if (!customerId) {
      const branchId = lead.branchId ?? claims.branchIds[0] ?? null;
      const newCustomer = await tx.customer.create({
        data: {
          orgId: claims.orgId,
          branchId,
          type: 'individual',
          name: lead.contactName,
          phone: lead.contactPhone,
          email: lead.contactEmail,
          tags: '[]',
          createdById: claims.sub,
        },
      });
      customerId = newCustomer.id;
    }

    // Link the lead and any of its follow-ups to the customer.
    await tx.lead.update({
      where: { id: lead.id },
      data: { status: 'converted', customerId },
    });
    await tx.followUp.updateMany({
      where: { leadId: lead.id },
      data: { customerId },
    });

    return tx.customer.findUniqueOrThrow({
      where: { id: customerId },
      include: {
        branch: { select: { id: true, name: true } },
        state: { select: { id: true, name: true } },
      },
    });
  });

  return created(serializeCustomer(customer));
});
