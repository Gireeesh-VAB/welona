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
      let inventoryItems: unknown[] = [];
      try { inventoryItems = JSON.parse(row.inventoryItemsJson ?? '[]'); } catch { inventoryItems = []; }
      let serviceSnapshots: unknown[] = [];
      try { serviceSnapshots = JSON.parse(row.serviceSnapshotsJson ?? '[]'); } catch { serviceSnapshots = []; }
      return {
        id: row.id, name: row.name,
        serviceIds: ids, services,
        serviceSnapshots,
        inventoryItems,
        defaultSessions: row.defaultSessions, price: row.price,
        taxPercent: row.taxPercent ?? 0,
        taxType: row.taxType ?? 'exclusive',
        collectAdvance: row.collectAdvance ?? false,
        advancePercent: row.advancePercent ?? 0,
      };
    }),
  );

  return ok(data);
});
