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
 * Returns per-item stock across all warehouses with address info for picking slips.
 */
export const GET = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);

  const indent = await db.stockIndent.findUnique({
    where: { id: params.id },
    include: {
      items: { include: { product: { select: { id: true, name: true, sku: true, uom: true } } } },
      branch: { select: { name: true } },
    },
  });
  if (!indent) throw Errors.notFound('Indent');

  const availability = await Promise.all(
    indent.items.map(async (item) => {
      const stocks = await db.inventoryStock.findMany({
        where: { productId: item.productId },
        include: {
          warehouse: {
            include: {
              branch: { select: { name: true, address: true, city: true, phone: true } },
            },
          },
        },
        orderBy: { quantity: 'desc' },
      });

      const warehouses = stocks.map((s) => ({
        warehouseId: s.warehouseId,
        warehouseName: s.warehouse.name,
        branchId: s.warehouse.branchId,
        branchName: s.warehouse.branch.name,
        branchAddress: s.warehouse.branch.address ?? null,
        branchCity: s.warehouse.branch.city ?? null,
        branchPhone: s.warehouse.branch.phone ?? null,
        quantity: s.quantity,
        canFulfill: s.quantity >= (item.approvedQty ?? item.requestedQty),
      }));

      const needed = item.approvedQty ?? item.requestedQty;
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
        neededQty: needed,
        warehouses,
        recommendation: recommended
          ? {
              warehouseId: recommended.warehouseId,
              warehouseName: recommended.warehouseName,
              branchId: recommended.branchId,
              branchName: recommended.branchName,
              branchAddress: recommended.branchAddress,
              branchCity: recommended.branchCity,
              branchPhone: recommended.branchPhone,
              availableQty: recommended.quantity,
              canFullyFulfill: recommended.canFulfill,
            }
          : null,
      };
    }),
  );

  // Group items by recommended warehouse so the driver knows one place to visit
  const pickupGroups: Record<string, { warehouseId: string; warehouseName: string; branchName: string; branchAddress: string | null; branchCity: string | null; branchPhone: string | null; items: { productName: string; productSku: string; productUom: string; pickQty: number }[] }> = {};
  for (const avail of availability) {
    if (avail.recommendation) {
      const key = avail.recommendation.warehouseId;
      if (!pickupGroups[key]) {
        pickupGroups[key] = {
          warehouseId: avail.recommendation.warehouseId,
          warehouseName: avail.recommendation.warehouseName,
          branchName: avail.recommendation.branchName,
          branchAddress: avail.recommendation.branchAddress,
          branchCity: avail.recommendation.branchCity,
          branchPhone: avail.recommendation.branchPhone,
          items: [],
        };
      }
      pickupGroups[key].items.push({
        productName: avail.productName,
        productSku: avail.productSku,
        productUom: avail.productUom,
        pickQty: avail.neededQty,
      });
    }
  }

  return ok({
    indentId: indent.id,
    indentNumber: indent.number ?? null,
    destinationBranch: indent.branch?.name ?? null,
    status: indent.status,
    items: availability,
    pickupGroups: Object.values(pickupGroups),
  });
});
