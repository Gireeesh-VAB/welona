import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok, created } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { bookingCreateSchema } from '@shared/schemas/customer-modules';

type Ctx = { params: { id: string } };

async function requireCustomer(orgId: string, id: string) {
  const customer = await db.customer.findFirst({ where: { id, orgId } });
  if (!customer) throw Errors.notFound('Customer');
  return customer;
}

/** GET /api/v1/customers/[id]/bookings — bookings for a customer. */
export const GET = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'bookings:read');
  await requireCustomer(claims.orgId, params.id);

  const bookings = await db.booking.findMany({
    where: { customerId: params.id },
    orderBy: { scheduledAt: 'desc' },
  });
  return ok(bookings);
});

/** POST /api/v1/customers/[id]/bookings — create a booking. */
export const POST = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'bookings:create');
  const customer = await requireCustomer(claims.orgId, params.id);

  const body = await parseBody(req, bookingCreateSchema);
  const booking = await db.booking.create({
    data: {
      orgId: claims.orgId,
      customerId: customer.id,
      branchId: body.branchId ?? customer.branchId,
      serviceName: body.serviceName,
      scheduledAt: new Date(body.scheduledAt),
      status: body.status ?? 'scheduled',
      notes: body.notes || null,
      createdById: claims.sub,
    },
  });
  return created(booking);
});
