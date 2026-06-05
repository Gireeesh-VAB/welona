import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { resolveOrgId } from '@/lib/org';
import { quotationUpdateSchema } from '@shared/schemas/sales';
import { computeTotals } from '@/lib/sales/service';
import { quotationDetailInclude } from '@/lib/sales/includes';

type Ctx = { params: { id: string } };

async function loadQuotation(orgId: string, id: string) {
  const quotation = await db.quotation.findFirst({
    where: { id, orgId },
    include: quotationDetailInclude,
  });
  if (!quotation) throw Errors.notFound('Quotation');
  return quotation;
}

/** GET /api/v1/admin/sales/quotations/[id] — quotation detail with line items. */
export const GET = route<Ctx>(async (req, { params }) => {
  requireAdminAuth(req);
  const orgId = await resolveOrgId();
  return ok(await loadQuotation(orgId, params.id));
});

/**
 * PATCH /api/v1/admin/sales/quotations/[id] — edit a quotation. Line items and
 * pricing can only change while the quotation is still a draft.
 */
export const PATCH = route<Ctx>(async (req, { params }) => {
  requireAdminAuth(req);
  const orgId = await resolveOrgId();
  const existing = await loadQuotation(orgId, params.id);
  const body = await parseBody(req, quotationUpdateSchema);

  if (body.items && existing.status !== 'draft') {
    throw Errors.badRequest('Line items can only be edited while the quotation is a draft');
  }
  if (body.ownerStaffId) {
    const owner = await db.staff.findFirst({
      where: { id: body.ownerStaffId, orgId },
    });
    if (!owner) throw Errors.badRequest('Selected salesperson does not exist');
  }

  const updated = await db.$transaction(async (tx) => {
    if (body.items) {
      const totals = computeTotals(body.items);
      await tx.quotationItem.deleteMany({ where: { quotationId: params.id } });
      await tx.quotation.update({
        where: { id: params.id },
        data: {
          subtotal: totals.subtotal,
          discountAmt: totals.discountAmt,
          taxAmt: totals.taxAmt,
          total: totals.total,
          items: { create: totals.lines },
        },
      });
    }
    return tx.quotation.update({
      where: { id: params.id },
      data: {
        validUntil:
          body.validUntil !== undefined
            ? body.validUntil
              ? new Date(body.validUntil)
              : null
            : undefined,
        notes: body.notes !== undefined ? body.notes || null : undefined,
        ownerStaffId: body.ownerStaffId ?? undefined,
      },
      include: quotationDetailInclude,
    });
  });

  return ok(updated);
});
