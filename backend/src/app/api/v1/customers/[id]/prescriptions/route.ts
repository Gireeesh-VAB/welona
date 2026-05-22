import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok, created } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { prescriptionCreateSchema } from '@shared/schemas/customer-modules';

type Ctx = { params: { id: string } };

async function requireCustomer(orgId: string, id: string) {
  const customer = await db.customer.findFirst({ where: { id, orgId } });
  if (!customer) throw Errors.notFound('Customer');
  return customer;
}

/** GET /api/v1/customers/[id]/prescriptions — prescriptions for a customer. */
export const GET = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'customers:read');
  await requireCustomer(claims.orgId, params.id);

  const prescriptions = await db.prescription.findMany({
    where: { customerId: params.id },
    orderBy: { issuedAt: 'desc' },
  });
  return ok(prescriptions);
});

/** POST /api/v1/customers/[id]/prescriptions — create a prescription. */
export const POST = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'customers:create');
  const customer = await requireCustomer(claims.orgId, params.id);

  const body = await parseBody(req, prescriptionCreateSchema);
  const prescription = await db.prescription.create({
    data: {
      orgId: claims.orgId,
      customerId: customer.id,
      prescribedBy: body.prescribedBy || null,
      diagnosis: body.diagnosis || null,
      medications: body.medications || null,
      notes: body.notes || null,
      fileUrl: body.fileUrl || null,
      issuedAt: body.issuedAt ? new Date(body.issuedAt) : new Date(),
      createdById: claims.sub,
    },
  });
  return created(prescription);
});
