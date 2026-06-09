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
    include: { items: { orderBy: { sortOrder: 'asc' } } },
    orderBy: { scheduledAt: 'desc' },
  });

  // Resolve consultant names from the Employee table (consultantStaffId stores an Employee.id)
  const consultantIds = [...new Set(bookings.map(b => b.consultantStaffId).filter(Boolean))] as string[];
  const employeeMap: Record<string, string> = {};
  if (consultantIds.length) {
    const employees = await db.employee.findMany({
      where: { id: { in: consultantIds } },
      select: { id: true, name: true },
    });
    employees.forEach(e => { employeeMap[e.id] = e.name; });
  }

  return ok(
    bookings.map((b) => ({
      id: b.id,
      number: b.number,
      status: b.status,
      scheduledAt: b.scheduledAt.toISOString(),
      createdAt: b.createdAt.toISOString(),
      serviceName: b.serviceName,
      totalAmount: b.totalAmount,
      discount: b.discount,
      roundOff: b.roundOff,
      netAmount: b.netAmount,
      paidAmount: b.paidAmount,
      notes: b.notes,
      consultantId: b.consultantStaffId,
      consultantName: b.consultantStaffId ? (employeeMap[b.consultantStaffId] ?? null) : null,
      items: b.items.map((it) => ({
        id: it.id,
        category: it.category,
        service: it.service,
        quantity: it.quantity,
        amount: it.amount,
        lineTotal: it.lineTotal,
      })),
    })),
  );
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
