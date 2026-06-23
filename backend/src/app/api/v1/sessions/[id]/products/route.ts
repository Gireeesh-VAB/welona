import { db } from '@/lib/db';
import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAuth } from '@/lib/auth/service';
import { getDefaultWarehouseId } from '@/lib/warehouse';

type Ctx = { params: { id: string } };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveServiceIds(pkg: any): string[] {
  try {
    const snap: string[] = JSON.parse(pkg.serviceIdsSnapshot ?? '[]');
    if (snap.length > 0) return snap;
  } catch { /* fall through */ }
  try {
    return JSON.parse(pkg.master?.serviceIds ?? '[]') as string[];
  } catch { return []; }
}

/**
 * GET /api/v1/sessions/:packageId/products
 * Returns product requirements grouped by service.
 */
export const GET = route<Ctx>(async (req, { params }) => {
  const claims = requireAuth(req);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dba = db as any;

  const pkg = await db.package.findFirst({
    where:   { id: params.id, orgId: claims.orgId },
    include: { master: { select: { serviceIds: true, serviceSnapshotsJson: true } } },
  });
  if (!pkg) throw Errors.notFound('Package');

  const serviceIds = resolveServiceIds(pkg);
  if (serviceIds.length === 0) return ok([]);

  // Per-service session counts from the snapshot on the master
  type Snapshot = { serviceId: string; serviceName: string; sessions: number; customSessions?: number };
  let snapshots: Snapshot[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  try { snapshots = JSON.parse((pkg as any).master?.serviceSnapshotsJson ?? '[]'); } catch { /* */ }

  // Fallback names from live service records
  const services = await db.service.findMany({
    where:  { id: { in: serviceIds } },
    select: { id: true, name: true },
  });

  // All ServiceInventoryItems for all services in this package
  const allItems = await dba.serviceInventoryItem.findMany({
    where:   { serviceId: { in: serviceIds } },
    include: {
      product: {
        select: { id: true, name: true, uom: true, consumptionUom: true, unitsPerPurchase: true },
      },
    },
    orderBy: { sortOrder: 'asc' },
  });

  if (allItems.length === 0) return ok([]);

  // Unique product IDs for stock/consumable lookup
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uniqueProductIds = [...new Set((allItems as any[]).map((it: any) => it.productId as string))];

  let stockMap = new Map<string, number>();
  const consumableMap = new Map<string, {
    unitId: string; status: string; remaining: number;
    totalCapacity: number; usedQuantity: number;
  }>();

  if (pkg.branchId) {
    try {
      const warehouseId = await getDefaultWarehouseId(dba, pkg.branchId);
      const stocks = await db.inventoryStock.findMany({
        where:  { warehouseId, productId: { in: uniqueProductIds } },
        select: { productId: true, quantity: true },
      });
      stockMap = new Map(stocks.map(s => [s.productId, s.quantity]));

      const consumableProductIds = [...new Set(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (allItems as any[])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((it: any) => it.product.consumptionUom && it.product.unitsPerPurchase > 1)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((it: any) => it.productId as string),
      )];

      if (consumableProductIds.length > 0) {
        const openUnits = await dba.consumableUnit.findMany({
          where:   { productId: { in: consumableProductIds }, branchId: pkg.branchId, status: 'open' },
          orderBy: { openedAt: 'asc' },
        });
        const sealedUnits = await dba.consumableUnit.findMany({
          where:   { productId: { in: consumableProductIds }, branchId: pkg.branchId, status: 'sealed' },
          orderBy: { createdAt: 'asc' },
        });
        for (const productId of consumableProductIds) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const activeUnit = openUnits.find((u: any) => u.productId === productId)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ?? sealedUnits.find((u: any) => u.productId === productId);
          if (!activeUnit) continue;
          consumableMap.set(productId, {
            unitId:        activeUnit.id,
            status:        activeUnit.status,
            remaining:     activeUnit.totalCapacity - activeUnit.usedQuantity,
            totalCapacity: activeUnit.totalCapacity,
            usedQuantity:  activeUnit.usedQuantity,
          });
        }
      }
    } catch { /* warehouse not configured — skip stock */ }
  }

  // Build grouped response — one entry per service that has mapped products
  const groups = serviceIds
    .map(svcId => {
      const snap = snapshots.find(s => s.serviceId === svcId);
      const svc  = services.find(s => s.id === svcId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const svcItems = (allItems as any[]).filter(it => it.serviceId === svcId);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const products = svcItems.map((it: any) => {
        const avail        = stockMap.get(it.productId) ?? null;
        const isConsumable = !!(it.product.consumptionUom) && it.product.unitsPerPurchase > 1;
        const cu           = consumableMap.get(it.productId) ?? null;
        const needed       = it.quantityPerSession as number;
        return {
          productId:          it.product.id,
          productName:        it.product.name,
          quantityPerSession: needed,
          uom:                it.product.uom ?? null,
          availableStock:     avail,
          isLowStock:         avail !== null && avail < needed,
          isConsumable,
          consumptionUom:     it.product.consumptionUom ?? null,
          unitsPerPurchase:   it.product.unitsPerPurchase ?? 1,
          consumableUnit:     cu ? { ...cu, willNeedNextUnit: cu.remaining < needed } : null,
        };
      });

      return {
        serviceId:         svcId,
        serviceName:       snap?.serviceName ?? svc?.name ?? 'Unknown Service',
        effectiveSessions: snap?.customSessions ?? snap?.sessions ?? 1,
        products,
      };
    })
    .filter(g => g.products.length > 0);

  return ok(groups);
});
