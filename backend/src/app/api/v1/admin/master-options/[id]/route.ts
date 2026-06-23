import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { resolveOrgId } from '@/lib/org';
import { masterOptionUpdateSchema } from '@shared/schemas/sales';

type Ctx = { params: { id: string } };

export const PATCH = route<Ctx>(async (req, { params }) => {
  requireAdminAuth(req);
  const orgId = await resolveOrgId();
  const body = await parseBody(req, masterOptionUpdateSchema);

  const existing = await db.masterOption.findFirst({ where: { id: params.id, orgId } });
  if (!existing) throw Errors.notFound('Option');

  const updated = await db.masterOption.update({
    where: { id: params.id },
    data: {
      ...(body.label !== undefined && { label: body.label }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
    },
  });
  return ok(updated);
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  requireAdminAuth(req);
  const orgId = await resolveOrgId();

  const existing = await db.masterOption.findFirst({ where: { id: params.id, orgId } });
  if (!existing) throw Errors.notFound('Option');

  await db.masterOption.delete({ where: { id: params.id } });
  return ok({ deleted: true });
});
