import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { treatmentUpdateSchema } from '@/lib/sales/schemas';

type Ctx = { params: { id: string } };

async function loadTreatment(orgId: string, id: string) {
  const treatment = await db.treatment.findFirst({ where: { id, orgId } });
  if (!treatment) throw Errors.notFound('Treatment');
  return treatment;
}

/** PATCH /api/v1/treatments/[id] — edit a treatment or toggle its active state. */
export const PATCH = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'sales:update');
  await loadTreatment(claims.orgId, params.id);
  const body = await parseBody(req, treatmentUpdateSchema);

  const data: Prisma.TreatmentUpdateInput = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.category !== undefined) data.category = body.category || null;
  if (body.description !== undefined) data.description = body.description || null;
  if (body.durationMinutes !== undefined) data.durationMinutes = body.durationMinutes ?? null;
  if (body.price !== undefined) data.price = body.price ?? null;
  if (body.isActive !== undefined) data.isActive = body.isActive;

  const updated = await db.treatment.update({ where: { id: params.id }, data });
  return ok(updated);
});

/** DELETE /api/v1/treatments/[id] — deactivate a treatment (soft delete). */
export const DELETE = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'sales:update');
  await loadTreatment(claims.orgId, params.id);

  await db.treatment.update({ where: { id: params.id }, data: { isActive: false } });
  return ok({ deactivated: true });
});
