import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok, created } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { sessionEntryCreateSchema } from '@shared/schemas/customer-modules';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dba = db as any;

type Ctx = { params: { id: string; itemId: string } };

async function requirePackage(orgId: string, customerId: string, itemId: string) {
  const pkg = await db.package.findFirst({
    where: { id: itemId, customerId, orgId },
  });
  if (!pkg) throw Errors.notFound('Package');
  return pkg;
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

  // Auto-calculate session number
  const last = await dba.sessionEntry.findFirst({
    where:   { packageId: pkg.id },
    orderBy: { sessionNumber: 'desc' },
    select:  { sessionNumber: true },
  });
  const sessionNumber = (last?.sessionNumber ?? 0) + 1;

  const result = await db.$transaction(async (tx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txA = tx as any;
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

    if (body.status === 'completed') {
      const newUsed = pkg.usedSessions + 1;
      const newStatus = newUsed >= pkg.totalSessions ? 'completed' : pkg.status;
      await tx.package.update({
        where: { id: pkg.id },
        data:  { usedSessions: newUsed, status: newStatus },
      });
    }

    return entry;
  });

  return created({
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
