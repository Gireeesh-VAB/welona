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

  type RawItem = { productId: string; productName: string; quantityPerSession: number; chargeType: string; uom?: string | null };
  let rawItems: RawItem[] = [];

  // Look up service by name and fetch its ServiceInventoryItem mappings
  const service = await db.service.findFirst({
    where: { name: serviceName, isActive: true },
    select: { id: true },
  });

  if (service) {
    const svcItems = await dba.serviceInventoryItem.findMany({
      where:   { serviceId: service.id },
      include: { product: { select: { id: true, name: true, uom: true } } },
      orderBy: { sortOrder: 'asc' },
    });
    rawItems = svcItems.map((it: any) => ({
      productId:          it.product.id,
      productName:        it.product.name,
      quantityPerSession: it.quantityPerSession,
      chargeType:         it.chargeType ?? 'consume_only',
      uom:                it.product.uom ?? null,
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
          include: { product: { select: { id: true, name: true, uom: true } } },
          orderBy: { sortOrder: 'asc' },
        });
        rawItems = svcItems.map((it: any) => ({
          productId:          it.product.id,
          productName:        it.product.name,
          quantityPerSession: it.quantityPerSession,
          chargeType:         it.chargeType ?? 'consume_only',
          uom:                it.product.uom ?? null,
        }));
      }
    }
  }

  if (rawItems.length === 0) return ok([]);

  // Fetch available stock if branchId provided
  let stockMap = new Map<string, number>();
  if (branchId) {
    try {
      const warehouseId = await getDefaultWarehouseId(dba, branchId);
      const productIds  = rawItems.map((it) => it.productId);
      const stocks = await db.inventoryStock.findMany({
        where:  { warehouseId, productId: { in: productIds } },
        select: { productId: true, quantity: true },
      });
      stockMap = new Map(stocks.map((s) => [s.productId, s.quantity]));
    } catch {
      // warehouse not configured — skip stock
    }
  }

  return ok(
    rawItems.map((it) => ({
      productId:          it.productId,
      productName:        it.productName,
      quantityPerSession: it.quantityPerSession,
      chargeType:         it.chargeType ?? 'consume_only',
      uom:                it.uom ?? null,
      availableStock:     stockMap.get(it.productId) ?? null,
    })),
  );
});
