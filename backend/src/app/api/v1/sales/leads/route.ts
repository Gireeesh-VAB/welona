import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { leadCreateSchema, listQuerySchema } from '@shared/schemas/sales';

/** Lead list rows include the owner, customer, treatment and next follow-up. */
const leadInclude = {
  owner: { select: { id: true, name: true } },
  customer: { select: { id: true, name: true } },
  branch: { select: { id: true, name: true } },
  treatment: { select: { id: true, name: true } },
  followUps: {
    where: { status: 'pending', dueAt: { not: null } },
    orderBy: { dueAt: 'asc' },
    take: 1,
  },
} satisfies Prisma.LeadInclude;

/**
 * GET  /api/v1/sales/leads — paginated, filterable lead list.
 * POST /api/v1/sales/leads — create a lead ("who is interested?").
 */
export const GET = route(async (req) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'sales:read');
  const query = parseQuery(req, listQuerySchema);

  const staffBranchId = claims.branchIds[0] ?? null;
  const where: Prisma.LeadWhereInput = { orgId: claims.orgId };
  if (query.status) where.status = query.status;
  const effectiveBranchId = query.branchId ?? staffBranchId;
  if (effectiveBranchId) where.branchId = effectiveBranchId;
  if (query.ownerStaffId) where.ownerStaffId = query.ownerStaffId;
  if (query.search) {
    where.OR = [
      { contactName: { contains: query.search } },
      { contactPhone: { contains: query.search } },
      { contactEmail: { contains: query.search } },
    ];
  }

  const [rows, total] = await Promise.all([
    db.lead.findMany({
      where,
      include: leadInclude,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    db.lead.count({ where }),
  ]);

  return ok(rows, buildMeta(query.page, query.limit, total));
});

export const POST = route(async (req) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'sales:create');
  const body = await parseBody(req, leadCreateSchema);

  // "Follow-Up By" defaults to the current user when not chosen.
  const ownerStaffId = body.ownerStaffId ?? claims.sub;
  const owner = await db.staff.findFirst({
    where: { id: ownerStaffId, orgId: claims.orgId },
  });
  if (!owner) throw Errors.badRequest('Selected salesperson does not exist');

  if (body.customerId) {
    const customer = await db.customer.findFirst({
      where: { id: body.customerId, orgId: claims.orgId },
    });
    if (!customer) throw Errors.badRequest('Selected customer does not exist');
  }

  const lead = await db.lead.create({
    data: {
      orgId: claims.orgId,
      branchId: body.branchId ?? null,
      customerId: body.customerId ?? null,
      contactName: body.contactName,
      contactPhone: body.contactPhone,
      contactEmail: body.contactEmail || null,
      gender: body.gender ?? null,
      enquiryType: body.enquiryType || null,
      media: body.media || null,
      callType: body.callType || null,
      healthStatus: body.healthStatus || null,
      leadTransfer: body.leadTransfer ?? false,
      source: body.source,
      interest: body.interest || null,
      treatmentId: body.treatmentId ?? null,
      estimatedValue: body.estimatedValue ?? null,
      ownerStaffId,
      notes: body.notes || null,
    },
    include: leadInclude,
  });

  return created(lead);
});
