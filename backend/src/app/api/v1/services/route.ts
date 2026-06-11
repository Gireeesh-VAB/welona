import { db } from '@/lib/db';
import { route, parseQuery, booleanQueryParam } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/service';
import { CATEGORY_FLAG_KEYS } from '@shared/schemas/admin-categories';
import { z } from 'zod';

const querySchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().optional(),
  isActive: booleanQueryParam(),
});

const serviceIncludeBranch = {
  category: true,
  inventoryItems: {
    include: { product: { select: { name: true, uom: true, reorderLevel: true } } },
    orderBy: { sortOrder: 'asc' as const },
  },
} as const;

type ServiceRow = Awaited<ReturnType<typeof db.service.findMany<{ include: typeof serviceIncludeBranch }>>>[number];

/**
 * GET /api/v1/services — branch-staff service catalogue filtered by BranchService.
 *
 * Strict branch isolation:
 *  - Staff with a branchId see ONLY services explicitly assigned to their branch.
 *    If the branch has no assignments → return empty (no fallback to full catalogue).
 *  - Org-wide staff (branchIds=[]) see all active services.
 */
export const GET = route(async (req) => {
  const claims = requireAuth(req);
  const branchId = claims.branchIds[0] ?? null;

  const { search, categoryId, isActive } = parseQuery(req, querySchema);
  const showActive = isActive ?? true;

  if (branchId) {
    const assigned = await db.branchService.findMany({
      where: { branchId },
      select: { serviceId: true },
    });

    if (assigned.length === 0) {
      return ok([]);
    }

    const assignedServiceIds = assigned.map((a) => a.serviceId);
    const where: Record<string, unknown> = {
      isActive: showActive,
      id: { in: assignedServiceIds },
    };
    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { category: { name: { contains: search } } },
      ];
    }

    const services = await db.service.findMany({
      where,
      orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
      include: serviceIncludeBranch,
    });

    const stockMap = await buildStockMap(services, branchId);
    return ok(services.map((s) => serialize(s, stockMap)));
  }

  // Org-wide staff: no branch restriction.
  const where: Record<string, unknown> = { isActive: showActive };
  if (categoryId) where.categoryId = categoryId;
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { category: { name: { contains: search } } },
    ];
  }

  const services = await db.service.findMany({
    where,
    orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
    include: serviceIncludeBranch,
  });

  return ok(services.map((s) => serialize(s, new Map())));
});

async function buildStockMap(
  services: ServiceRow[],
  branchId: string,
): Promise<Map<string, number>> {
  const allProductIds = services.flatMap((s) => s.inventoryItems.map((i) => i.productId));
  if (allProductIds.length === 0) return new Map();

  const wh =
    (await db.warehouse.findFirst({ where: { branchId, isDefault: true }, select: { id: true } })) ??
    (await db.warehouse.findFirst({ where: { branchId, isActive: true }, select: { id: true } }));
  if (!wh) return new Map();

  const stocks = await db.inventoryStock.findMany({
    where: { warehouseId: wh.id, productId: { in: allProductIds } },
    select: { productId: true, quantity: true },
  });
  return new Map(stocks.map((s) => [s.productId, s.quantity]));
}

function serialize(s: ServiceRow, stockMap: Map<string, number>) {
  const categoryFlags = CATEGORY_FLAG_KEYS.reduce(
    (acc, key) => {
      acc[key] = (s.category?.[key] as boolean) ?? false;
      return acc;
    },
    {} as Record<string, boolean>,
  );

  const inventoryItems = s.inventoryItems.map((item) => {
    const onHandQty = stockMap.get(item.productId) ?? 0;
    const lowStockThreshold = item.lowStockThreshold ?? item.product.reorderLevel ?? 0;
    return {
      productId: item.productId,
      productName: item.product.name,
      productUom: item.product.uom,
      quantityPerSession: item.quantityPerSession,
      onHandQty,
      lowStockThreshold,
      isLowStock: onHandQty <= lowStockThreshold,
    };
  });

  const hasLowStock = inventoryItems.some((i) => i.isLowStock);

  return {
    id: s.id,
    name: s.name,
    categoryId: s.categoryId,
    categoryName: (s.category?.['name'] as string) ?? null,
    hsnSacCode: s.hsnSacCode,
    minPrice: s.minPrice,
    maxPrice: s.maxPrice,
    taxPercent: s.taxPercent,
    taxType: s.taxType,
    hasMeasurements: s.hasMeasurements,
    hasComplementary: s.hasComplementary,
    isActive: s.isActive,
    categoryFlags,
    inventoryItems,
    hasLowStock,
  };
}
