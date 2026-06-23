import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import {
  adminPackageSessionMasterCreateSchema,
  adminPackageSessionMasterListQuerySchema,
} from '@shared/schemas/admin-package-session-masters';
import type { AdminPackageSessionMaster, ServicePriceSnapshot } from '@shared/types/admin-package-session-master';

async function resolveOrgId(): Promise<string> {
  const org = await db.organization.findFirst({ select: { id: true } });
  if (!org) throw Errors.notFound('Organization');
  return org.id;
}

type SnapshotOverride = { customPricePerSession?: number; customSessions?: number };

async function buildSnapshots(
  serviceIds: string[],
  overrides: Map<string, SnapshotOverride> = new Map(),
): Promise<ServicePriceSnapshot[]> {
  if (!serviceIds.length) return [];
  const svcs = await db.service.findMany({
    where: { id: { in: serviceIds } },
    select: { id: true, name: true, maxPrice: true, taxPercent: true, taxType: true, sessions: true } as any,
  });
  return serviceIds
    .map(id => {
      const s = svcs.find((x: any) => x.id === id) as any;
      if (!s) return null;
      const ov = overrides.get(id);
      return {
        serviceId: s.id, serviceName: s.name, maxPrice: s.maxPrice,
        ...(ov?.customPricePerSession !== undefined && { customPricePerSession: ov.customPricePerSession }),
        ...(ov?.customSessions        !== undefined && { customSessions:        ov.customSessions }),
        taxPercent: s.taxPercent, taxType: s.taxType, sessions: s.sessions ?? 1,
      };
    })
    .filter((x): x is ServicePriceSnapshot => x !== null);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function toMaster(row: any, packageCount = 0): Promise<AdminPackageSessionMaster> {
  const ids: string[] = JSON.parse(row.serviceIds || '[]');
  const services = ids.length
    ? await db.service.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true },
      })
    : [];
  const inventoryItems = JSON.parse(row.inventoryItemsJson || '[]');
  const serviceSnapshots: ServicePriceSnapshot[] = JSON.parse(row.serviceSnapshotsJson || '[]');
  return {
    id:               row.id,
    orgId:            row.orgId,
    name:             row.name,
    description:      row.description ?? null,
    serviceIds:       ids,
    services,
    serviceSnapshots,
    inventoryItems,
    defaultSessions:  row.defaultSessions,
    price:            row.price,
    taxPercent:       row.taxPercent ?? 0,
    taxType:          row.taxType ?? 'exclusive',
    collectAdvance:   row.collectAdvance ?? false,
    advancePercent:   row.advancePercent ?? 0,
    isActive:         row.isActive,
    packageCount,
    createdAt:        row.createdAt.toISOString(),
    updatedAt:        row.updatedAt.toISOString(),
  };
}

export const GET = route(async (req) => {
  requireAdminAuth(req);
  const { page, limit, search, active } = parseQuery(req, adminPackageSessionMasterListQuerySchema);
  const skip = (page - 1) * limit;
  const orgId = await resolveOrgId();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { orgId };
  if (search) where.name = { contains: search };
  if (active === 'true')  where.isActive = true;
  if (active === 'false') where.isActive = false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dba = db as any;
  const [rows, total] = await Promise.all([
    dba.packageSessionMaster.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    dba.packageSessionMaster.count({ where }),
  ]);

  const masterIds = rows.map((r: any) => r.id);
  const pkgCounts = masterIds.length
    ? await db.package.groupBy({ by: ['masterId'], where: { masterId: { in: masterIds } }, _count: true })
    : [];
  const countMap = new Map(pkgCounts.map((r: any) => [r.masterId, r._count]));

  const data = await Promise.all(rows.map((r: any) => toMaster(r, countMap.get(r.id) ?? 0)));
  return ok(data, buildMeta(page, limit, total));
});

export const POST = route(async (req) => {
  const claims = requireAdminAuth(req);
  const body = await parseBody(req, adminPackageSessionMasterCreateSchema);
  const orgId = await resolveOrgId();

  const serviceIds = body.serviceIds ?? [];
  const overridesMap = new Map(
    (body.servicePriceOverrides ?? []).map(
      (o: { serviceId: string; customPricePerSession?: number; customSessions?: number }) =>
        [o.serviceId, { customPricePerSession: o.customPricePerSession, customSessions: o.customSessions }],
    ),
  );
  const snapshots = await buildSnapshots(serviceIds, overridesMap);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dba = db as any;
  const row = await dba.packageSessionMaster.create({
    data: {
      orgId,
      name:                 body.name,
      description:          body.description ?? null,
      serviceIds:           JSON.stringify(serviceIds),
      serviceSnapshotsJson: JSON.stringify(snapshots),
      inventoryItemsJson:   JSON.stringify(body.inventoryItems ?? []),
      defaultSessions:      body.defaultSessions,
      price:                body.price,
      taxPercent:           body.taxPercent ?? 0,
      taxType:              body.taxType ?? 'exclusive',
      collectAdvance:       body.collectAdvance ?? false,
      advancePercent:       body.advancePercent ?? 0,
      isActive:             body.isActive ?? true,
      createdByAdminId:     claims.sub,
    },
  });
  return created(await toMaster(row));
});
