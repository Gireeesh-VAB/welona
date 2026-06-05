import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { resolveOrgId } from '@/lib/org';
import { listQuerySchema, quotationCreateSchema } from '@shared/schemas/sales';
import { computeTotals, nextDocumentNumber } from '@/lib/sales/service';

const listInclude = {
  customer: { select: { id: true, name: true } },
  owner: { select: { id: true, name: true } },
} satisfies Prisma.QuotationInclude;

/**
 * GET  /api/v1/admin/sales/quotations — paginated quotation list.
 * POST /api/v1/admin/sales/quotations — create a draft quotation with line items.
 *
 * Branch sessions are hard-scoped to their branch.
 */
export const GET = route(async (req) => {
  requireAdminAuth(req);
  const orgId = await resolveOrgId();
  const query = parseQuery(req, listQuerySchema);

  const where: Prisma.QuotationWhereInput = { orgId };
  const branchId = query.branchId;
  if (query.status) where.status = query.status;
  if (branchId) where.branchId = branchId;
  if (query.ownerStaffId) where.ownerStaffId = query.ownerStaffId;
  if (query.search) {
    where.OR = [
      { number: { contains: query.search } },
      { customer: { name: { contains: query.search } } },
    ];
  }

  const [rows, total] = await Promise.all([
    db.quotation.findMany({
      where,
      include: listInclude,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    db.quotation.count({ where }),
  ]);

  return ok(rows, buildMeta(query.page, query.limit, total));
});

export const POST = route(async (req) => {
  requireAdminAuth(req);
  const orgId = await resolveOrgId();
  const body = await parseBody(req, quotationCreateSchema);

  const [customer, owner] = await Promise.all([
    db.customer.findFirst({
      where: { id: body.customerId, orgId },
    }),
    // Branch sessions may only assign a salesperson from their own branch.
    db.staff.findFirst({
      where: { id: body.ownerStaffId, orgId },
    }),
  ]);
  if (!customer) throw Errors.badRequest('Selected customer does not exist');
  if (!owner) throw Errors.badRequest('Selected salesperson does not exist');

  const totals = computeTotals(body.items);

  const quotation = await db.$transaction(async (tx) => {
    const number = await nextDocumentNumber(tx, orgId, 'quotation', 'QT');
    return tx.quotation.create({
      data: {
        orgId,
        // Branch sessions pin the quotation to their branch.
        branchId: body.branchId ?? customer.branchId,
        number,
        customerId: body.customerId,
        leadId: body.leadId ?? null,
        ownerStaffId: body.ownerStaffId,
        status: 'draft',
        validUntil: body.validUntil ? new Date(body.validUntil) : null,
        notes: body.notes || null,
        subtotal: totals.subtotal,
        discountAmt: totals.discountAmt,
        taxAmt: totals.taxAmt,
        total: totals.total,
        items: { create: totals.lines },
      },
      include: listInclude,
    });
  });

  return created(quotation);
});
