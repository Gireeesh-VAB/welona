import { db } from '@/lib/db';
import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/service';
import type { PackageSessionMasterOption } from '@shared/types/admin-package-session-master';

/** GET /api/v1/package-session-masters — active masters for branch staff. */
export const GET = route(async (req) => {
  const claims = requireAuth(req);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dba = db as any;
  const rows = await dba.packageSessionMaster.findMany({
    where:   { orgId: claims.orgId, isActive: true },
    orderBy: { name: 'asc' },
  });

  const data: PackageSessionMasterOption[] = await Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rows.map(async (row: any) => {
      const ids: string[] = JSON.parse(row.serviceIds || '[]');
      const services = ids.length
        ? await db.service.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
        : [];
      return {
        id: row.id, name: row.name,
        serviceIds: ids, services,
        defaultSessions: row.defaultSessions, price: row.price,
      };
    }),
  );

  return ok(data);
});
