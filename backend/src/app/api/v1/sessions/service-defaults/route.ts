import { z } from 'zod';
import { db } from '@/lib/db';
import { route, parseQuery } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/service';
import { getDefaultWarehouseId } from '@/lib/warehouse';

const schema = z.object({
  serviceName: z.string().trim().min(1),
  branchId:    z.string().trim().optional(),
});

/**
 * GET /api/v1/sessions/service-defaults?serviceName=X&branchId=Y
 * Returns products mapped to a service via ServiceInventoryItem (Service Master mappings).
 * Always uses Service Master product mappings — package-level products are separate.
 */
export const GET = route(async (req) => {
  const claims = requireAuth(req);
  const { serviceName, branchId } = parseQuery(req, schema);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dba = db as any;

  type RawItem = {
    productId: string; productName: string; quantityPerSession: number; chargeType: string;
    uom?: string | null; consumptionUom?: string | null; unitsPerPurchase?: number;
  };
  let rawItems: RawItem[] = [];

  const productSelect = { id: true, name: true, uom: true, consumptionUom: true, unitsPerPurchase: true };

  // Look up service by name and fetch its ServiceInventoryItem mappings
  const service = await db.service.findFirst({
    where: { name: serviceName, isActive: true },
    select: { id: true },
  });

  if (service) {
    const svcItems = await dba.serviceInventoryItem.findMany({
      where:   { serviceId: service.id },
      include: { product: { select: productSelect } },
      orderBy: { sortOrder: 'asc' },
    });
    rawItems = svcItems.map((it: any) => ({
      productId:          it.product.id,
      productName:        it.product.name,
      quantityPerSession: it.quantityPerSession,
      chargeType:         it.chargeType ?? 'consume_only',
      uom:                it.product.uom ?? null,
      consumptionUom:     it.product.consumptionUom ?? null,
      unitsPerPurchase:   it.product.unitsPerPurchase ?? 1,
    }));
  }

  // If service not found by name, try resolving via PackageSessionMaster → serviceIds
  if (rawItems.length === 0) {
    const pkgMaster = await dba.packageSessionMaster.findFirst({
      where:  { orgId: claims.orgId, name: serviceName, isActive: true },
      select: { serviceIds: true },
    });
    if (pkgMaster) {
      let serviceIds: string[] = [];
      try { serviceIds = JSON.parse(pkgMaster.serviceIds || '[]'); } catch { /* */ }
      if (serviceIds.length > 0) {
        const svcItems = await dba.serviceInventoryItem.findMany({
          where:   { serviceId: { in: serviceIds } },
          include: { product: { select: productSelect } },
          orderBy: { sortOrder: 'asc' },
        });
        rawItems = svcItems.map((it: any) => ({
          productId:          it.product.id,
          productName:        it.product.name,
          quantityPerSession: it.quantityPerSession,
          chargeType:         it.chargeType ?? 'consume_only',
          uom:                it.product.uom ?? null,
          consumptionUom:     it.product.consumptionUom ?? null,
          unitsPerPurchase:   it.product.unitsPerPurchase ?? 1,
        }));
      }
    }
  }

  if (rawItems.length === 0) return ok([]);

  // Fetch available stock in consumption units when branchId is provided.
  // For consumable products (consumptionUom set, unitsPerPurchase > 1) available capacity
  // comes from ConsumableUnit records; for others use InventoryStock directly.
  const availableMap = new Map<string, number | null>();
  if (branchId) {
    try {
      const warehouseId = await getDefaultWarehouseId(dba, branchId);
      const productIds  = rawItems.map((it) => it.productId);

      const stocks = await db.inventoryStock.findMany({
        where:  { warehouseId, productId: { in: productIds } },
        select: { productId: true, quantity: true },
      });
      const stockMap = new Map(stocks.map((s) => [s.productId, s.quantity]));

      for (const it of rawItems) {
        const isConsumable = !!(it.consumptionUom) && (it.unitsPerPurchase ?? 1) > 1;
        if (isConsumable) {
          const units = await dba.consumableUnit.findMany({
            where: { productId: it.productId, branchId, status: { in: ['sealed', 'open'] } },
            select: { totalCapacity: true, usedQuantity: true },
          });
          const available = (units as any[]).reduce(
            (sum: number, u: any) => sum + (u.totalCapacity - u.usedQuantity), 0,
          );
          availableMap.set(it.productId, available);
        } else {
          const qty = stockMap.get(it.productId) ?? 0;
          availableMap.set(it.productId, qty);
        }
      }
    } catch {
      // warehouse not configured — leave availableMap empty
    }
  }

  return ok(
    rawItems.map((it) => ({
      productId:          it.productId,
      productName:        it.productName,
      quantityPerSession: it.quantityPerSession,
      chargeType:         it.chargeType ?? 'consume_only',
      uom:                it.consumptionUom ?? it.uom ?? null,
      consumptionUom:     it.consumptionUom ?? null,
      unitsPerPurchase:   it.unitsPerPurchase ?? 1,
      availableStock:     branchId ? (availableMap.get(it.productId) ?? null) : null,
    })),
  );
});
