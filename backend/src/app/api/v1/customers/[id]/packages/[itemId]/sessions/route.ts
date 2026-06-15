import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok, created } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { sessionEntryCreateSchema } from '@shared/schemas/customer-modules';
import { applyServiceSessionStockByIds } from '@/lib/service-inventory';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dba = db as any;

type Ctx = { params: { id: string; itemId: string } };

async function requirePackage(orgId: string, customerId: string, itemId: string) {
  const pkg = await db.package.findFirst({
    where: { id: itemId, customerId, orgId },
    include: { master: { select: { serviceIds: true } } },
  });
  if (!pkg) throw Errors.notFound('Package');
  return pkg;
}

/**
 * Resolve service IDs for inventory deduction.
 * Prefers the snapshotted list captured at purchase time; falls back to the
 * live master so that packages created before snapshotting still work.
 */
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

/** GET /api/v1/customers/[id]/packages/[itemId]/sessions — list session entries. */
export const GET = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'customers:read');
  await requirePackage(claims.orgId, params.id, params.itemId);

  const entries = await dba.sessionEntry.findMany({
    where: { packageId: params.itemId },
    orderBy: { sessionNumber: 'asc' },
  });

  return ok(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    entries.map((e: any) => ({
      id:            e.id,
      packageId:     e.packageId,
      bookingId:     e.bookingId,
      sessionNumber: e.sessionNumber,
      sessionDate:   e.sessionDate.toISOString(),
      staffName:     e.staffName,
      status:        e.status,
      remarks:       e.remarks,
      createdAt:     e.createdAt.toISOString(),
    })),
  );
});

/** POST /api/v1/customers/[id]/packages/[itemId]/sessions — log a session entry. */
export const POST = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'customers:update');
  const pkg = await requirePackage(claims.orgId, params.id, params.itemId);

  const body = await parseBody(req, sessionEntryCreateSchema);

  const remaining = pkg.totalSessions - pkg.usedSessions;
  if (body.status === 'completed' && remaining <= 0) {
    throw Errors.badRequest('No remaining sessions in this package');
  }

  const result = await db.$transaction(async (tx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txA = tx as any;

    // Fix: compute session number inside the transaction to prevent race conditions
    // when two sessions are logged concurrently for the same package.
    const last = await txA.sessionEntry.findFirst({
      where:   { packageId: pkg.id },
      orderBy: { sessionNumber: 'desc' },
      select:  { sessionNumber: true },
    });
    const sessionNumber = (last?.sessionNumber ?? 0) + 1;

    const entry = await txA.sessionEntry.create({
      data: {
        orgId:         claims.orgId,
        packageId:     pkg.id,
        bookingId:     body.bookingId ?? null,
        sessionNumber,
        sessionDate:   new Date(body.sessionDate),
        staffName:     body.staffName ?? null,
        status:        body.status,
        remarks:       body.remarks ?? null,
        createdById:   claims.sub,
      },
    });

    let inventorySkipped = false;

    if (body.status === 'completed') {
      const newUsed = pkg.usedSessions + 1;
      const newStatus = newUsed >= pkg.totalSessions ? 'completed' : pkg.status;
      await tx.package.update({
        where: { id: pkg.id },
        data:  { usedSessions: newUsed, status: newStatus },
      });

      if (pkg.branchId) {
        const serviceIds = resolveServiceIds(pkg);
        if (serviceIds.length > 0) {
          await applyServiceSessionStockByIds(tx, {
            branchId: pkg.branchId,
            ref: entry.id,
            serviceIds,
          });
        } else {
          // Package has no service mapping — inventory deduction skipped.
          inventorySkipped = true;
        }
      }
    }

    return { ...entry, inventorySkipped };
  });

  return created({
    id:               result.id,
    packageId:        result.packageId,
    bookingId:        result.bookingId,
    sessionNumber:    result.sessionNumber,
    sessionDate:      result.sessionDate.toISOString(),
    staffName:        result.staffName,
    status:           result.status,
    remarks:          result.remarks,
    createdAt:        result.createdAt.toISOString(),
    inventorySkipped: result.inventorySkipped,
  });
});
