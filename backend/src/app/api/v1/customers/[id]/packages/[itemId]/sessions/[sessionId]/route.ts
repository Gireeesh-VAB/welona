import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { sessionEntryUpdateSchema } from '@shared/schemas/customer-modules';
import { applyServiceSessionStockByIds } from '@/lib/service-inventory';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dba = db as any;

type Ctx = { params: { id: string; itemId: string; sessionId: string } };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveServiceIds(pkg: any): string[] {
  try {
    const snapshot: string[] = JSON.parse(pkg.serviceIdsSnapshot ?? '[]');
    if (snapshot.length > 0) return snapshot;
  } catch { /* fall through */ }
  try {
    return JSON.parse(pkg.master?.serviceIds ?? '[]') as string[];
  } catch {
    return [];
  }
}

/** PATCH /api/v1/customers/[id]/packages/[itemId]/sessions/[sessionId] — update a session entry. */
export const PATCH = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'customers:update');

  const pkg = await db.package.findFirst({
    where: { id: params.itemId, customerId: params.id, orgId: claims.orgId },
    include: { master: { select: { serviceIds: true } } },
  });
  if (!pkg) throw Errors.notFound('Package');

  const entry = await dba.sessionEntry.findFirst({
    where: { id: params.sessionId, packageId: params.itemId },
  });
  if (!entry) throw Errors.notFound('Session entry');

  const body = await parseBody(req, sessionEntryUpdateSchema);

  const becomingCompleted = body.status === 'completed' && entry.status !== 'completed';
  if (becomingCompleted && pkg.usedSessions >= pkg.totalSessions) {
    throw Errors.badRequest('No remaining sessions in this package');
  }
  const leavingCompleted = entry.status === 'completed' && body.status && body.status !== 'completed';

  const result = await db.$transaction(async (tx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txA = tx as any;
    const updated = await txA.sessionEntry.update({
      where: { id: entry.id },
      data: {
        ...(body.bookingId   !== undefined && { bookingId:   body.bookingId ?? null }),
        ...(body.sessionDate !== undefined && { sessionDate: new Date(body.sessionDate) }),
        ...(body.staffName   !== undefined && { staffName:   body.staffName ?? null }),
        ...(body.status      !== undefined && { status:      body.status }),
        ...(body.remarks     !== undefined && { remarks:     body.remarks ?? null }),
      },
    });

    if (becomingCompleted) {
      const newUsed   = pkg.usedSessions + 1;
      const newStatus = newUsed >= pkg.totalSessions ? 'completed' : pkg.status;
      await tx.package.update({ where: { id: pkg.id }, data: { usedSessions: newUsed, status: newStatus } });
      if (pkg.branchId) {
        const serviceIds = resolveServiceIds(pkg);
        if (serviceIds.length > 0) {
          await applyServiceSessionStockByIds(tx, { branchId: pkg.branchId, ref: updated.id, serviceIds, force: true });
        }
      }
    } else if (leavingCompleted) {
      const newUsed = Math.max(0, pkg.usedSessions - 1);
      await tx.package.update({ where: { id: pkg.id }, data: { usedSessions: newUsed, status: 'active' } });
      if (pkg.branchId) {
        const serviceIds = resolveServiceIds(pkg);
        if (serviceIds.length > 0) {
          await applyServiceSessionStockByIds(tx, { branchId: pkg.branchId, ref: updated.id, serviceIds, reverse: true });
        }
      }
    }

    return updated;
  });

  return ok({
    id:            result.id,
    packageId:     result.packageId,
    bookingId:     result.bookingId,
    sessionNumber: result.sessionNumber,
    sessionDate:   result.sessionDate.toISOString(),
    staffName:     result.staffName,
    status:        result.status,
    remarks:       result.remarks,
    createdAt:     result.createdAt.toISOString(),
  });
});
