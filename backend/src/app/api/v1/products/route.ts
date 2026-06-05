import { db } from '@/lib/db';
import { route, parseQuery, booleanQueryParam } from '@/lib/api/handler';
import { ok, buildMeta } from '@/lib/api/response';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { z } from 'zod';

const querySchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().optional(),
  isActive: booleanQueryParam(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

/**
 * GET /api/v1/products — branch-staff read-only product catalogue.
 *
 * Strict branch isolation:
 *  - Staff with a branchId see ONLY products explicitly assigned to their branch
 *    via BranchProduct. No assignment → return empty (no fallback to full catalogue).
 *  - Org-wide staff (branchIds=[]) see the full catalogue.
 *
 * Product is admin-managed globally (no orgId).
 */
export const GET = route(async (req) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'sales:read');

  const { search, categoryId, isActive, page, limit } = parseQuery(req, querySchema);
  const branchId = claims.branchIds[0] ?? null;

  if (branchId) {
    // Strict: only return what is explicitly assigned to this branch.
    const assigned = await db.branchProduct.findMany({
      where: { branchId },
      select: { productId: true },
    });

    if (assigned.length === 0) {
      return ok([], buildMeta(page, limit, 0));
    }

    const assignedProductIds = assigned.map((a) => a.productId);
    const where: Record<string, unknown> = { id: { in: assignedProductIds } };
    if (isActive !== undefined) where.isActive = isActive;
    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.AND = [
        { id: { in: assignedProductIds } },
        {
          OR: [
            { name: { contains: search } },
            { sku: { contains: search } },
            { brand: { contains: search } },
          ],
        },
      ];
      delete where.id;
    }

    const [items, total] = await Promise.all([
      db.product.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { category: { select: { id: true, name: true } } },
      }),
      db.product.count({ where }),
    ]);

    return ok(items.map(serialize), buildMeta(page, limit, total));
  }

  // Org-wide staff: full catalogue.
  const where: Record<string, unknown> = {};
  if (isActive !== undefined) where.isActive = isActive;
  if (categoryId) where.categoryId = categoryId;
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { sku: { contains: search } },
      { brand: { contains: search } },
    ];
  }

  const [items, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { category: { select: { id: true, name: true } } },
    }),
    db.product.count({ where }),
  ]);

  return ok(items.map(serialize), buildMeta(page, limit, total));
});

function serialize(p: {
  id: string;
  name: string;
  sku: string;
  brand: string | null;
  uom: string;
  categoryId: string | null;
  category?: { name: string } | null;
  purchasePrice: number;
  salePrice: number;
  mrp: number;
  reorderLevel: number;
  trackBatches: boolean;
  trackExpiry: boolean;
  isActive: boolean;
  imageUrl: string | null;
}) {
  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    brand: p.brand,
    uom: p.uom,
    categoryId: p.categoryId,
    categoryName: p.category?.name ?? null,
    purchasePrice: p.purchasePrice,
    salePrice: p.salePrice,
    mrp: p.mrp,
    reorderLevel: p.reorderLevel,
    trackBatches: p.trackBatches,
    trackExpiry: p.trackExpiry,
    isActive: p.isActive,
    imageUrl: p.imageUrl,
  };
}
