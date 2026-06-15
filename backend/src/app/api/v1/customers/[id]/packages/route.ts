import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok, created } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { packageCreateSchema } from '@shared/schemas/customer-modules';

type Ctx = { params: { id: string } };

async function requireCustomer(orgId: string, id: string) {
  const customer = await db.customer.findFirst({ where: { id, orgId } });
  if (!customer) throw Errors.notFound('Customer');
  return customer;
}

/** Resolve master serviceIds to a snapshotable JSON string. */
async function resolveServiceIdsJson(masterId: string | null | undefined): Promise<string> {
  if (!masterId) return '[]';
  const master = await (db as any).packageSessionMaster.findUnique({
    where: { id: masterId },
    select: { serviceIds: true },
  });
  return master?.serviceIds ?? '[]';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function enrichMaster(pkg: any) {
  if (!pkg.masterId) return pkg;
  const master = await (db as any).packageSessionMaster.findUnique({
    where: { id: pkg.masterId },
    select: { id: true, name: true, serviceIds: true },
  });
  if (!master) return pkg;
  let serviceIds: string[] = [];
  try { serviceIds = JSON.parse(master.serviceIds ?? '[]'); } catch { serviceIds = []; }
  const services = await db.service.findMany({
    where: { id: { in: serviceIds } },
    select: { id: true, name: true },
  });
  return { ...pkg, master: { id: master.id, name: master.name, services } };
}

/** Auto-expire packages whose expiresAt has passed. Run inline on GET to avoid needing a cron job. */
async function autoExpirePackages(packageIds: string[]): Promise<void> {
  if (packageIds.length === 0) return;
  await db.package.updateMany({
    where: {
      id: { in: packageIds },
      status: 'active',
      expiresAt: { lt: new Date() },
    },
    data: { status: 'expired' },
  });
}

/** GET /api/v1/customers/[id]/packages — packages for a customer. */
export const GET = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'customers:read');
  await requireCustomer(claims.orgId, params.id);

  const packages = await (db as any).package.findMany({
    where: { customerId: params.id },
    orderBy: { createdAt: 'desc' },
    include: {
      sessionEntries: { orderBy: { sessionNumber: 'asc' } },
      invoices: { select: { id: true, number: true, total: true, amountPaid: true, status: true } },
    },
  });

  // Auto-expire any active packages whose expiry date has passed.
  const activeIds = packages
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((p: any) => p.status === 'active' && p.expiresAt && new Date(p.expiresAt) < new Date())
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((p: any) => p.id);
  if (activeIds.length > 0) {
    await autoExpirePackages(activeIds);
    // Reflect the new status in the in-memory list so the response is accurate.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const p of packages) {
      if (activeIds.includes(p.id)) p.status = 'expired';
    }
  }

  const enriched = await Promise.all(packages.map(enrichMaster));
  return ok(enriched);
});

/** POST /api/v1/customers/[id]/packages — create a package. */
export const POST = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'customers:create');
  const customer = await requireCustomer(claims.orgId, params.id);

  const body = await parseBody(req, packageCreateSchema);
  if (body.usedSessions > body.totalSessions) {
    throw Errors.badRequest('Used sessions cannot exceed total sessions');
  }
  const branchId = claims.branchIds?.[0] ?? null;

  // Snapshot the master's serviceIds at creation time so future edits to the
  // master don't retroactively change this package's inventory mapping.
  const serviceIdsSnapshot = await resolveServiceIdsJson(body.masterId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pkg = await (db as any).package.create({
    data: {
      orgId:               claims.orgId,
      customerId:          customer.id,
      branchId,
      masterId:            body.masterId ?? null,
      serviceIdsSnapshot,
      treatmentId:         body.treatmentId ?? null,
      name:                body.name,
      totalSessions:       body.totalSessions,
      usedSessions:        body.usedSessions,
      price:               body.price,
      purchasedAt:         body.purchasedAt ? new Date(body.purchasedAt) : new Date(),
      expiresAt:           body.expiresAt ? new Date(body.expiresAt) : null,
      status:              body.status ?? 'active',
      notes:               body.notes || null,
      createdById:         claims.sub,
    },
  });
  const enriched = await enrichMaster(pkg);
  return created(enriched);
});
