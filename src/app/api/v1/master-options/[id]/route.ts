import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { masterOptionUpdateSchema } from '@/lib/sales/schemas';

type Ctx = { params: { id: string } };

async function loadOption(orgId: string, id: string) {
  const option = await db.masterOption.findFirst({ where: { id, orgId } });
  if (!option) throw Errors.notFound('Option');
  return option;
}

/** PATCH /api/v1/master-options/[id] — rename or toggle a dropdown option. */
export const PATCH = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'sales:update');
  await loadOption(claims.orgId, params.id);
  const body = await parseBody(req, masterOptionUpdateSchema);

  const data: Prisma.MasterOptionUpdateInput = {};
  if (body.label !== undefined) data.label = body.label;
  if (body.isActive !== undefined) data.isActive = body.isActive;
  if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;

  const updated = await db.masterOption.update({ where: { id: params.id }, data });
  return ok(updated);
});

/** DELETE /api/v1/master-options/[id] — deactivate a dropdown option. */
export const DELETE = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'sales:update');
  await loadOption(claims.orgId, params.id);

  await db.masterOption.update({ where: { id: params.id }, data: { isActive: false } });
  return ok({ deactivated: true });
});
