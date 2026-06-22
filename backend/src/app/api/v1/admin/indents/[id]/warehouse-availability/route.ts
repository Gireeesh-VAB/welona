import { db } from '@/lib/db';
import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';

interface RouteContext {
  params: { id: string };
}

/**
 * GET /api/v1/admin/indents/[id]/warehouse-availability
 * Returns per-item stock across all warehouses, with fulfillment recommendation.
 */
export const GET = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);

  const indent = await db.stockIndent.findUnique({
    where: { id: params.id },
    include: {
      items: { include: { product: { select: { id: true, name: true, sku: true, uom: true } } } },
    },
  });
  if (!indent) throw Errors.notFound('Indent');

  const availability = await Promise.all(
    indent.items.map(async (item) => {
      const stocks = await db.inventoryStock.findMany({
        where: { productId: item.productId },
        include: {
          warehouse: {
            include: { branch: { select: { name: true } } },
          },
        },
        orderBy: { quantity: 'desc' },
      });

      const warehouses = stocks.map((s) => ({
        warehouseId: s.warehouseId,
        warehouseName: s.warehouse.name,
        branchName: s.warehouse.branch.name,
        quantity: s.quantity,
        canFulfill: s.quantity >= item.requestedQty,
      }));

      const fulfillable = warehouses.filter((w) => w.canFulfill);
      const recommended = fulfillable.length > 0 ? fulfillable[0] : warehouses.length > 0 ? warehouses[0] : null;

      return {
        itemId: item.id,
        productId: item.productId,
        productName: item.product.name,
        productSku: item.product.sku,
        productUom: item.product.uom,
        requestedQty: item.requestedQty,
        approvedQty: item.approvedQty ?? null,
        warehouses,
        recommendation: recommended
          ? {
              warehouseId: recommended.warehouseId,
              warehouseName: recommended.warehouseName,
              branchName: recommended.branchName,
              availableQty: recommended.quantity,
              canFullyFulfill: recommended.canFulfill,
            }
          : null,
      };
    }),
  );

  return ok({
    indentId: indent.id,
    indentNumber: indent.number ?? null,
    status: indent.status,
    items: availability,
  });
});
