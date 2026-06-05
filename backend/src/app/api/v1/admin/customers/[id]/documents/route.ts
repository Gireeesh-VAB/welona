import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok, created } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { resolveOrgId } from '@/lib/org';
import { documentCreateSchema } from '@shared/schemas/customer-modules';

type Ctx = { params: { id: string } };

async function requireCustomer(orgId: string, id: string) {
  const customer = await db.customer.findFirst({
    where: { id, orgId },
  });
  if (!customer) throw Errors.notFound('Customer');
  return customer;
}

/** GET /api/v1/admin/customers/[id]/documents — documents for a customer. */
export const GET = route<Ctx>(async (req, { params }) => {
  requireAdminAuth(req);
  const orgId = await resolveOrgId();
  await requireCustomer(orgId, params.id);

  const documents = await db.document.findMany({
    where: { customerId: params.id },
    orderBy: { uploadedAt: 'desc' },
  });
  return ok(documents);
});

/** POST /api/v1/admin/customers/[id]/documents — add a document. */
export const POST = route<Ctx>(async (req, { params }) => {
  requireAdminAuth(req);
  const orgId = await resolveOrgId();
  const customer = await requireCustomer(orgId, params.id);

  const body = await parseBody(req, documentCreateSchema);
  const document = await db.document.create({
    data: {
      orgId,
      customerId: customer.id,
      title: body.title,
      docType: body.docType || null,
      fileUrl: body.fileUrl || null,
      notes: body.notes || null,
      uploadedAt: body.uploadedAt ? new Date(body.uploadedAt) : new Date(),
      createdById: null,
    },
  });
  return created(document);
});
