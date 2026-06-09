import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { prescriptionUpdateSchema } from '@shared/schemas/customer-modules';

type Ctx = { params: { id: string; itemId: string } };

/** DELETE /api/v1/customers/[id]/prescriptions/[itemId] — delete a prescription. */
export const DELETE = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'customers:update');

  const prescription = await db.prescription.findFirst({
    where: { id: params.itemId, customerId: params.id, orgId: claims.orgId },
  });
  if (!prescription) throw Errors.notFound('Prescription');

  await db.prescription.delete({ where: { id: params.itemId } });
  return ok({ deleted: true });
});

/** PATCH /api/v1/customers/[id]/prescriptions/[itemId] — update a prescription. */
export const PATCH = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'customers:update');

  const prescription = await db.prescription.findFirst({
    where: { id: params.itemId, customerId: params.id, orgId: claims.orgId },
  });
  if (!prescription) throw Errors.notFound('Prescription');

  const body = await parseBody(req, prescriptionUpdateSchema);
  const data: Prisma.PrescriptionUpdateInput = {};
  if (body.prescribedBy !== undefined) data.prescribedBy = body.prescribedBy || null;
  if (body.diagnosis !== undefined) data.diagnosis = body.diagnosis || null;
  if (body.medications !== undefined) data.medications = body.medications || null;
  if (body.notes !== undefined) data.notes = body.notes || null;
  if (body.fileUrl !== undefined) data.fileUrl = body.fileUrl || null;
  if (body.issuedAt !== undefined) data.issuedAt = new Date(body.issuedAt);

  const updated = await db.prescription.update({ where: { id: params.itemId }, data });
  return ok(updated);
});
