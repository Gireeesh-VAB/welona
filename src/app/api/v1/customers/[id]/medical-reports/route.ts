import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok, created } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { medicalReportCreateSchema } from '@/lib/customer-modules';

type Ctx = { params: { id: string } };

async function requireCustomer(orgId: string, id: string) {
  const customer = await db.customer.findFirst({ where: { id, orgId } });
  if (!customer) throw Errors.notFound('Customer');
  return customer;
}

/** GET /api/v1/customers/[id]/medical-reports — medical reports for a customer. */
export const GET = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'customers:read');
  await requireCustomer(claims.orgId, params.id);

  const reports = await db.medicalReport.findMany({
    where: { customerId: params.id },
    orderBy: { reportedAt: 'desc' },
  });
  return ok(reports);
});

/** POST /api/v1/customers/[id]/medical-reports — create a medical report. */
export const POST = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'customers:create');
  const customer = await requireCustomer(claims.orgId, params.id);

  const body = await parseBody(req, medicalReportCreateSchema);
  const report = await db.medicalReport.create({
    data: {
      orgId: claims.orgId,
      customerId: customer.id,
      title: body.title,
      reportType: body.reportType || null,
      findings: body.findings || null,
      notes: body.notes || null,
      fileUrl: body.fileUrl || null,
      reportedAt: body.reportedAt ? new Date(body.reportedAt) : new Date(),
      createdById: claims.sub,
    },
  });
  return created(report);
});
