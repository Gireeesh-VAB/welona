import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { packageUpdateSchema } from '@/lib/customer-modules';

type Ctx = { params: { id: string; itemId: string } };

/**
 * PATCH /api/v1/customers/[id]/packages/[itemId] — update a package, e.g.
 * record a used session or change its status.
 */
export const PATCH = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'customers:update');

  const pkg = await db.package.findFirst({
    where: { id: params.itemId, customerId: params.id, orgId: claims.orgId },
  });
  if (!pkg) throw Errors.notFound('Package');

  const body = await parseBody(req, packageUpdateSchema);
  const totalSessions = body.totalSessions ?? pkg.totalSessions;
  const usedSessions = body.usedSessions ?? pkg.usedSessions;
  if (usedSessions > totalSessions) {
    throw Errors.badRequest('Used sessions cannot exceed total sessions');
  }

  const data: Prisma.PackageUpdateInput = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.treatmentId !== undefined) data.treatmentId = body.treatmentId || null;
  if (body.totalSessions !== undefined) data.totalSessions = body.totalSessions;
  if (body.usedSessions !== undefined) data.usedSessions = body.usedSessions;
  if (body.price !== undefined) data.price = body.price;
  if (body.expiresAt !== undefined) data.expiresAt = new Date(body.expiresAt);
  if (body.notes !== undefined) data.notes = body.notes || null;
  if (body.status !== undefined) data.status = body.status;

  const updated = await db.package.update({ where: { id: params.itemId }, data });
  return ok(updated);
});
