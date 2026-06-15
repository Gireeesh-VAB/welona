import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { packageUpdateSchema } from '@shared/schemas/customer-modules';

type Ctx = { params: { id: string; itemId: string } };

/**
 * PATCH /api/v1/customers/[id]/packages/[itemId] — update package metadata.
 * usedSessions is intentionally NOT settable here; it is managed exclusively
 * through the session-entry workflow to keep the audit trail consistent.
 */
export const PATCH = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'customers:update');

  const pkg = await db.package.findFirst({
    where: { id: params.itemId, customerId: params.id, orgId: claims.orgId },
  });
  if (!pkg) throw Errors.notFound('Package');

  const body = await parseBody(req, packageUpdateSchema);
  if (body.totalSessions !== undefined && body.totalSessions < pkg.usedSessions) {
    throw Errors.badRequest('Total sessions cannot be reduced below the number already used');
  }

  const data: Prisma.PackageUpdateInput = {};
  if (body.name          !== undefined) data.name          = body.name;
  if (body.treatmentId   !== undefined) data.treatmentId   = body.treatmentId || null;
  if (body.totalSessions !== undefined) data.totalSessions = body.totalSessions;
  if (body.price         !== undefined) data.price         = body.price;
  if (body.expiresAt     !== undefined) data.expiresAt     = new Date(body.expiresAt);
  if (body.notes         !== undefined) data.notes         = body.notes || null;
  if (body.status        !== undefined) data.status        = body.status;

  const updated = await db.package.update({ where: { id: params.itemId }, data });
  return ok(updated);
});
