import { db } from '@/lib/db';
import { route, parseBody, parseQuery } from '@/lib/api/handler';
import { ok, created, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import {
  adminPackageSessionMasterCreateSchema,
  adminPackageSessionMasterListQuerySchema,
} from '@shared/schemas/admin-package-session-masters';
import type { AdminPackageSessionMaster } from '@shared/types/admin-package-session-master';

async function resolveOrgId(): Promise<string> {
  const org = await db.organization.findFirst({ select: { id: true } });
  if (!org) throw Errors.notFound('Organization');
  return org.id;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function toMaster(row: any): Promise<AdminPackageSessionMaster> {
  const ids: string[] = JSON.parse(row.serviceIds || '[]');
  const services = ids.length
    ? await db.service.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true },
      })
    : [];
  return {
    id:              row.id,
    orgId:           row.orgId,
    name:            row.name,
    description:     row.description ?? null,
    serviceIds:      ids,
    services,
    defaultSessions: row.defaultSessions,
    price:           row.price,
    isActive:        row.isActive,
    createdAt:       row.createdAt.toISOString(),
    updatedAt:       row.updatedAt.toISOString(),
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

  const data = await Promise.all(rows.map(toMaster));
  return ok(data, buildMeta(page, limit, total));
});

export const POST = route(async (req) => {
  const claims = requireAdminAuth(req);
  const body = await parseBody(req, adminPackageSessionMasterCreateSchema);
  const orgId = await resolveOrgId();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dba = db as any;
  const row = await dba.packageSessionMaster.create({
    data: {
      orgId,
      name:            body.name,
      description:     body.description ?? null,
      serviceIds:      JSON.stringify(body.serviceIds ?? []),
      defaultSessions: body.defaultSessions,
      price:           body.price,
      isActive:        body.isActive ?? true,
      createdByAdminId: claims.sub,
    },
  });
  return created(await toMaster(row));
});
