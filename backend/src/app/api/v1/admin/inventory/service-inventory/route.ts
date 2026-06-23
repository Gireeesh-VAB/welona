import { db } from '@/lib/db';
import { route, parseQuery } from '@/lib/api/handler';
import { ok, buildMeta } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminServiceInventoryQuerySchema } from '@shared/schemas/admin-inventory';
import type {
  AdminServiceInventoryRow,
  ServiceInventoryItemRow,
  ServiceInventoryReadiness,
} from '@shared/types/admin-service-inventory';

/**
 * GET /api/v1/admin/inventory/service-inventory?branchId=&search=&categoryId=&readiness=
 *
 * Returns every service with its product requirements and their current stock
 * levels for the requested branch.  The `readiness` field on each row indicates
 * whether the branch can currently perform that service:
 *   ready    — all linked products have stock above their low-stock threshold
 *   low      — at least one product is below its threshold but none are zero
 *   blocked  — at least one product is completely out of stock
 *   no_items — service has no product dependencies (no inventory check needed)
 */
export const GET = route(async (req) => {
  requireAdminAuth(req);
  const { branchId, search, categoryId, readiness: readinessFilter, page, limit } =
    parseQuery(req, adminServiceInventoryQuerySchema);

  const branch = await db.branch.findUnique({ where: { id: branchId }, select: { id: true } });
  if (!branch) throw Errors.notFound('Branch');

  // Fetch services with their inventory item mappings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serviceWhere: any = {};
  if (search) serviceWhere.name = { contains: search };
  if (categoryId) serviceWhere.categoryId = categoryId;

  const [services, totalRaw] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db as any).service.findMany({
      where: serviceWhere,
      include: {
        category: { select: { id: true, name: true } },
        inventoryItems: {
          where: { product: { availableForServices: true } },
          include: {
            product: { select: { id: true, name: true, sku: true, uom: true, consumptionUom: true, reorderLevel: true, availableForServices: true } },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db as any).service.count({ where: serviceWhere }),
  ]);

  // Batch-fetch current stock for all product IDs referenced across services
  const productIds = [
    ...new Set(
      services.flatMap((s: any) => s.inventoryItems.map((i: any) => i.productId as string)),
    ),
  ] as string[];

  const stockMap = new Map<string, number>();
  if (productIds.length > 0) {
    const stocks = await db.inventoryStock.findMany({
      where: { branchId, productId: { in: productIds } },
      select: { productId: true, quantity: true },
    });
    // Sum across warehouses within the branch
    for (const s of stocks) {
      stockMap.set(s.productId, (stockMap.get(s.productId) ?? 0) + s.quantity);
    }
  }

  // Build response rows
  let rows: AdminServiceInventoryRow[] = services.map((service: any) => {
    const items: ServiceInventoryItemRow[] = service.inventoryItems.map((item: any) => {
      const currentStock = stockMap.get(item.productId) ?? 0;
      const threshold = item.lowStockThreshold ?? item.product.reorderLevel ?? 0;
      const stockStatus =
        currentStock <= 0 ? 'out' : threshold > 0 && currentStock <= threshold ? 'low' : 'ok';
      return {
        id: item.id,
        productId: item.productId,
        productSku: item.product.sku,
        productName: item.product.name,
        productUom: item.product.uom,
        productConsumptionUom: (item.product as any).consumptionUom ?? item.product.uom,
        quantityPerSession: item.quantityPerSession,
        lowStockThreshold: item.lowStockThreshold,
        currentStock,
        stockStatus,
      };
    });

    let readiness: ServiceInventoryReadiness;
    if (items.length === 0) {
      readiness = 'no_items';
    } else if (items.some((i) => i.stockStatus === 'out')) {
      readiness = 'blocked';
    } else if (items.some((i) => i.stockStatus === 'low')) {
      readiness = 'low';
    } else {
      readiness = 'ready';
    }

    return {
      id: service.id,
      name: service.name,
      categoryId: service.categoryId,
      categoryName: service.category?.name ?? null,
      isActive: service.isActive,
      readiness,
      inventoryItems: items,
    };
  });

  // Apply readiness filter after computing it
  if (readinessFilter) {
    rows = rows.filter((r) => r.readiness === readinessFilter);
  }

  const total = readinessFilter ? rows.length : totalRaw;
  const start = (page - 1) * limit;
  const paged = rows.slice(start, start + limit);

  return ok(paged, buildMeta(page, limit, total));
});
