import { db } from '@/lib/db';
import { route, parseQuery, booleanQueryParam } from '@/lib/api/handler';
import { ok, buildMeta } from '@/lib/api/response';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import { z } from 'zod';

const querySchema = z.object({
  branchId: z.string().optional(),
  search: z.string().optional(),
  lowStockOnly: booleanQueryParam(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

type ProductRow = { id: string; name: string; sku: string; uom: string; reorderLevel: number; salePrice: number };
type StockRow = { productId: string; quantity: number };

/**
 * GET /api/v1/inventory/stock — branch-staff read-only stock view.
 *
 * Strict branch isolation:
 *  - Staff with a branchId see ONLY stock for products explicitly assigned
 *    to their branch (BranchProduct). No assignment → return empty.
 *  - Org-wide staff see all stock, optionally filtered by branchId param.
 */
export const GET = route(async (req) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'sales:read');

  const { branchId: queryBranchId, search, lowStockOnly, page, limit } = parseQuery(req, querySchema);
  const staffBranchId = claims.branchIds[0] ?? null;
  const effectiveBranchId = queryBranchId ?? staffBranchId;

  if (staffBranchId) {
    // Strict: only products explicitly assigned to this branch.
    const assigned = await db.branchProduct.findMany({
      where: { branchId: staffBranchId },
      select: { productId: true },
    });

    if (assigned.length === 0) {
      return ok([], buildMeta(page, limit, 0));
    }

    const assignedIds = assigned.map((a) => a.productId);

    const productWhere: Record<string, unknown> = { id: { in: assignedIds }, isActive: true };
    if (search) {
      productWhere.AND = [
        { id: { in: assignedIds } },
        { OR: [{ name: { contains: search } }, { sku: { contains: search } }] },
      ];
      delete productWhere.id;
    }

    const [products, stockRows] = await Promise.all([
      db.product.findMany({
        where: productWhere,
        orderBy: { name: 'asc' },
        select: { id: true, name: true, sku: true, uom: true, reorderLevel: true, salePrice: true },
      }),
      db.inventoryStock.findMany({
        where: { productId: { in: assignedIds }, warehouse: { branchId: staffBranchId } },
        select: { productId: true, quantity: true },
      }),
    ]);

    const [paginated, total] = paginate(toRows(products, stockRows, lowStockOnly), page, limit);
    return ok(paginated, buildMeta(page, limit, total));
  }

  // Org-wide staff: all products.
  const productWhere: Record<string, unknown> = { isActive: true };
  if (search) {
    productWhere.OR = [{ name: { contains: search } }, { sku: { contains: search } }];
  }

  const [products, stockRows] = await Promise.all([
    db.product.findMany({
      where: productWhere,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, sku: true, uom: true, reorderLevel: true, salePrice: true },
    }),
    db.inventoryStock.findMany({
      where: {
        product: productWhere,
        ...(effectiveBranchId ? { warehouse: { branchId: effectiveBranchId } } : {}),
      },
      select: { productId: true, quantity: true },
    }),
  ]);

  const [paginated, total] = paginate(toRows(products, stockRows, lowStockOnly), page, limit);
  return ok(paginated, buildMeta(page, limit, total));
});

function toRows(
  products: ProductRow[],
  stockRows: StockRow[],
  lowStockOnly: boolean | undefined,
) {
  const stockMap = new Map<string, number>();
  for (const row of stockRows) {
    stockMap.set(row.productId, (stockMap.get(row.productId) ?? 0) + row.quantity);
  }

  const rows = products.map((p) => {
    const qty = stockMap.get(p.id) ?? 0;
    const status =
      qty <= 0 ? 'out_of_stock' : p.reorderLevel && qty <= p.reorderLevel ? 'low_stock' : 'ok';
    return { id: p.id, name: p.name, sku: p.sku, uom: p.uom, quantity: qty, reorderLevel: p.reorderLevel, salePrice: p.salePrice, status };
  });

  return lowStockOnly ? rows.filter((r) => r.status !== 'ok') : rows;
}

function paginate<T>(items: T[], page: number, limit: number): [T[], number] {
  return [items.slice((page - 1) * limit, page * limit), items.length];
}
