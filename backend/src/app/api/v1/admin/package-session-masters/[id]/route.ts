import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminPackageSessionMasterUpdateSchema } from '@shared/schemas/admin-package-session-masters';
import type { AdminPackageSessionMaster, ServicePriceSnapshot } from '@shared/types/admin-package-session-master';

type Ctx = { params: { id: string } };

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
async function toMaster(row: any): Promise<AdminPackageSessionMaster> {
  const ids: string[] = JSON.parse(row.serviceIds || '[]');
  const services = ids.length
    ? await db.service.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
    : [];
  const inventoryItems = JSON.parse(row.inventoryItemsJson || '[]');
  const serviceSnapshots: ServicePriceSnapshot[] = JSON.parse(row.serviceSnapshotsJson || '[]');
  return {
    id: row.id, orgId: row.orgId, name: row.name,
    description: row.description ?? null,
    serviceIds: ids, services,
    serviceSnapshots,
    inventoryItems,
    defaultSessions: row.defaultSessions, price: row.price,
    taxPercent: row.taxPercent ?? 0, taxType: row.taxType ?? 'exclusive',
    collectAdvance: row.collectAdvance ?? false,
    advancePercent: row.advancePercent ?? 0,
    isActive: row.isActive,
    packageCount: 0,
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function requireMaster(id: string) {
  const orgId = await resolveOrgId();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dba = db as any;
  const row = await dba.packageSessionMaster.findFirst({ where: { id, orgId } });
  if (!row) throw Errors.notFound('Package Session Master');
  return row;
}

export const GET = route<Ctx>(async (req, { params }) => {
  requireAdminAuth(req);
  const row = await requireMaster(params.id);
  return ok(await toMaster(row));
});

export const PATCH = route<Ctx>(async (req, { params }) => {
  requireAdminAuth(req);
  await requireMaster(params.id);
  const body = await parseBody(req, adminPackageSessionMasterUpdateSchema);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dba = db as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {};
  if (body.name            !== undefined) data.name               = body.name;
  if (body.description     !== undefined) data.description        = body.description ?? null;
  const buildOverridesMap = (overrides: Array<{ serviceId: string; customPricePerSession?: number; customSessions?: number }>) =>
    new Map(overrides.map(o => [o.serviceId, { customPricePerSession: o.customPricePerSession, customSessions: o.customSessions }]));

  if (body.serviceIds !== undefined) {
    data.serviceIds = JSON.stringify(body.serviceIds);
    const snapshots = await buildSnapshots(body.serviceIds, buildOverridesMap(body.servicePriceOverrides ?? []));
    data.serviceSnapshotsJson = JSON.stringify(snapshots);
  } else if (body.servicePriceOverrides !== undefined) {
    // Price/session overrides changed but service list unchanged — re-snapshot with new values
    const existing = await (db as any).packageSessionMaster.findFirst({ where: { id: params.id }, select: { serviceIds: true } });
    if (existing) {
      const ids: string[] = JSON.parse(existing.serviceIds || '[]');
      const snapshots = await buildSnapshots(ids, buildOverridesMap(body.servicePriceOverrides));
      data.serviceSnapshotsJson = JSON.stringify(snapshots);
    }
  }
  if (body.inventoryItems  !== undefined) data.inventoryItemsJson = JSON.stringify(body.inventoryItems);
  if (body.defaultSessions !== undefined) data.defaultSessions    = body.defaultSessions;
  if (body.price           !== undefined) data.price              = body.price;
  if (body.taxPercent      !== undefined) data.taxPercent         = body.taxPercent;
  if (body.taxType         !== undefined) data.taxType            = body.taxType;
  if (body.collectAdvance  !== undefined) data.collectAdvance     = body.collectAdvance;
  if (body.advancePercent  !== undefined) data.advancePercent     = body.advancePercent;
  if (body.isActive        !== undefined) data.isActive           = body.isActive;

  const row = await dba.packageSessionMaster.update({ where: { id: params.id }, data });
  return ok(await toMaster(row));
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  requireAdminAuth(req);
  await requireMaster(params.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dba = db as any;
  await dba.packageSessionMaster.delete({ where: { id: params.id } });
  return ok({ deleted: true });
});
