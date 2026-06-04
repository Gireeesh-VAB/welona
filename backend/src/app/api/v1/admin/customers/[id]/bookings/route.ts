import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok, created } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminOrBranchAuth } from '@/lib/auth/service';
import { resolveOrgId } from '@/lib/org';
import { bookingCreateSchema } from '@shared/schemas/customer-modules';

type Ctx = { params: { id: string } };

async function requireCustomer(orgId: string, id: string, branchScope: string | null) {
  const customer = await db.customer.findFirst({
    where: { id, orgId, ...(branchScope && { branchId: branchScope }) },
  });
  if (!customer) throw Errors.notFound('Customer');
  return customer;
}

/** GET /api/v1/admin/customers/[id]/bookings — bookings for a customer. */
export const GET = route<Ctx>(async (req, { params }) => {
  const { branchScope } = requireAdminOrBranchAuth(req);
  const orgId = await resolveOrgId();
  await requireCustomer(orgId, params.id, branchScope);

  const bookings = await db.booking.findMany({
    where: { customerId: params.id },
    orderBy: { scheduledAt: 'desc' },
  });
  return ok(bookings);
});

/** POST /api/v1/admin/customers/[id]/bookings — create a booking. */
export const POST = route<Ctx>(async (req, { params }) => {
  const { branchScope } = requireAdminOrBranchAuth(req);
  const orgId = await resolveOrgId();
  const customer = await requireCustomer(orgId, params.id, branchScope);

  const body = await parseBody(req, bookingCreateSchema);
  const booking = await db.booking.create({
    data: {
      orgId,
      customerId: customer.id,
      branchId: body.branchId ?? customer.branchId,
      serviceName: body.serviceName,
      scheduledAt: new Date(body.scheduledAt),
      status: body.status ?? 'scheduled',
      notes: body.notes || null,
      createdById: null,
    },
  });
  return created(booking);
});
