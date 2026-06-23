import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { resolveOrgId } from '@/lib/org';
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
 * GET  /api/v1/admin/sales/leads — paginated, filterable lead list.
 * POST /api/v1/admin/sales/leads — create a lead ("who is interested?").
 *
 * Branch sessions are hard-scoped to their branch; admins see all branches and
 * may pass an optional `branchId` filter.
 */
export const GET = route(async (req) => {
  requireAdminAuth(req);
  const orgId = await resolveOrgId();
  const query = parseQuery(req, listQuerySchema);

  const where: Prisma.LeadWhereInput = { orgId };
  const branchId = query.branchId;
  if (query.status) {
    where.status = query.status;
  } else {
    // Converted leads are hidden from the default list — they live in Customers.
    where.status = { not: 'converted' };
  }
  if (branchId) where.branchId = branchId;
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
  requireAdminAuth(req);
  const orgId = await resolveOrgId();
  const body = await parseBody(req, leadCreateSchema);

  // Admin/branch sessions have no staff identity, so a salesperson must be
  // chosen explicitly (the employee panel defaults it to the logged-in staff).
  const ownerStaffId = body.ownerStaffId;
  if (!ownerStaffId) throw Errors.badRequest('Select a salesperson (owner) for the lead');
  // Branch sessions may only assign a salesperson from their own branch.
  const owner = await db.staff.findFirst({
    where: { id: ownerStaffId, orgId },
  });
  if (!owner) throw Errors.badRequest('Selected salesperson does not exist');

  if (body.customerId) {
    const customer = await db.customer.findFirst({
      where: { id: body.customerId, orgId },
    });
    if (!customer) throw Errors.badRequest('Selected customer does not exist');
  }

  const lead = await db.lead.create({
    data: {
      orgId,
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
