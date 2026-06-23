import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { resolveOrgId } from '@/lib/org';
import { treatmentUpdateSchema } from '@shared/schemas/sales';

type Ctx = { params: { id: string } };

export const PATCH = route<Ctx>(async (req, { params }) => {
  requireAdminAuth(req);
  const orgId = await resolveOrgId();
  const body = await parseBody(req, treatmentUpdateSchema);

  const existing = await db.treatment.findFirst({ where: { id: params.id, orgId } });
  if (!existing) throw Errors.notFound('Treatment');

  const updated = await db.treatment.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.category !== undefined && { category: body.category || null }),
      ...(body.description !== undefined && { description: body.description || null }),
      ...(body.durationMinutes !== undefined && { durationMinutes: body.durationMinutes ?? null }),
      ...(body.price !== undefined && { price: body.price ?? null }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
  });
  return ok(updated);
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  requireAdminAuth(req);
  const orgId = await resolveOrgId();

  const existing = await db.treatment.findFirst({ where: { id: params.id, orgId } });
  if (!existing) throw Errors.notFound('Treatment');

  await db.treatment.delete({ where: { id: params.id } });
  return ok({ deleted: true });
});
