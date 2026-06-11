import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminPackageSessionMasterUpdateSchema } from '@shared/schemas/admin-package-session-masters';
import type { AdminPackageSessionMaster } from '@shared/types/admin-package-session-master';

type Ctx = { params: { id: string } };

async function resolveOrgId(): Promise<string> {
  const org = await db.organization.findFirst({ select: { id: true } });
  if (!org) throw Errors.notFound('Organization');
  return org.id;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function toMaster(row: any): Promise<AdminPackageSessionMaster> {
  const ids: string[] = JSON.parse(row.serviceIds || '[]');
  const services = ids.length
    ? await db.service.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
    : [];
  return {
    id: row.id, orgId: row.orgId, name: row.name,
    description: row.description ?? null,
    serviceIds: ids, services,
    defaultSessions: row.defaultSessions, price: row.price, isActive: row.isActive,
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
  if (body.name            !== undefined) data.name            = body.name;
  if (body.description     !== undefined) data.description     = body.description ?? null;
  if (body.serviceIds      !== undefined) data.serviceIds      = JSON.stringify(body.serviceIds);
  if (body.defaultSessions !== undefined) data.defaultSessions = body.defaultSessions;
  if (body.price           !== undefined) data.price           = body.price;
  if (body.isActive        !== undefined) data.isActive        = body.isActive;

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
