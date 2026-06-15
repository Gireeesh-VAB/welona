import type { Prisma } from '@prisma/client';
import { getDefaultWarehouseId } from '@/lib/warehouse';
import { depleteBatchStockFEFO } from '@/lib/batch';
import { Errors } from '@/lib/api/errors';

type Tx = Prisma.TransactionClient;

export interface ServiceSessionLine {
  serviceName: string;
  sessionCount: number;
}

export interface StockShortfall {
  productId: string;
  productName: string;
  productUom: string;
  required: number;
  available: number;
}

/**
 * Check whether the branch has enough stock for the given service lines.
 * Returns an array of shortfalls — empty means stock is sufficient.
 * Run BEFORE opening the write transaction so the user can be warned.
 */
export async function checkServiceSessionStock(
  tx: Tx,
  opts: { branchId: string; orgId: string; lines: ServiceSessionLine[] },
): Promise<StockShortfall[]> {
  const { branchId, lines } = opts;
  if (lines.length === 0) return [];

  const serviceNames = [...new Set(lines.map((l) => l.serviceName))];
  const services = await tx.service.findMany({
    where: { name: { in: serviceNames }, isActive: true },
    select: {
      id: true,
      name: true,
      inventoryItems: {
        select: {
          productId: true,
          quantityPerSession: true,
          product: { select: { name: true, uom: true } },
        },
      },
    },
  });

  if (services.length === 0) return [];

  const serviceMap = new Map(services.map((s) => [s.name, s]));

  // Aggregate required qty per product across all service lines.
  const required = new Map<string, { name: string; uom: string; qty: number }>();
  for (const line of lines) {
    const svc = serviceMap.get(line.serviceName);
    if (!svc || svc.inventoryItems.length === 0) continue;
    for (const item of svc.inventoryItems) {
      const total = item.quantityPerSession * line.sessionCount;
      const existing = required.get(item.productId);
      if (existing) {
        existing.qty += total;
      } else {
        required.set(item.productId, { name: item.product.name, uom: item.product.uom, qty: total });
      }
    }
  }

  if (required.size === 0) return [];

  // Try to find branch warehouse — if none, skip check (no stock configured).
  const wh =
    (await tx.warehouse.findFirst({ where: { branchId, isDefault: true }, select: { id: true } })) ??
    (await tx.warehouse.findFirst({ where: { branchId, isActive: true }, select: { id: true } }));
  if (!wh) return [];

  const productIds = [...required.keys()];
  const stocks = await tx.inventoryStock.findMany({
    where: { warehouseId: wh.id, productId: { in: productIds } },
    select: { productId: true, quantity: true },
  });
  const stockMap = new Map(stocks.map((s) => [s.productId, s.quantity]));

  const shortfalls: StockShortfall[] = [];
  for (const [productId, { name, uom, qty }] of required) {
    const available = stockMap.get(productId) ?? 0;
    if (available < qty) {
      shortfalls.push({ productId, productName: name, productUom: uom, required: qty, available });
    }
  }
  return shortfalls;
}

/**
 * Deduct inventory for all service lines in a completed booking.
 * Must be called INSIDE a write transaction after the Booking row is created.
 */
export async function applyServiceSessionStock(
  tx: Tx,
  opts: { branchId: string; orgId: string; bookingRef: string; lines: ServiceSessionLine[] },
): Promise<void> {
  const { branchId, bookingRef, lines } = opts;
  if (lines.length === 0) return;

  const serviceNames = [...new Set(lines.map((l) => l.serviceName))];
  const services = await tx.service.findMany({
    where: { name: { in: serviceNames }, isActive: true },
    select: {
      id: true,
      name: true,
      inventoryItems: {
        select: {
          productId: true,
          quantityPerSession: true,
          product: { select: { id: true, trackBatches: true } },
        },
      },
    },
  });

  const serviceMap = new Map(services.map((s) => [s.name, s]));

  const toDeduct = new Map<string, { qty: number; trackBatches: boolean }>();
  for (const line of lines) {
    const svc = serviceMap.get(line.serviceName);
    if (!svc || svc.inventoryItems.length === 0) continue;
    for (const item of svc.inventoryItems) {
      const total = item.quantityPerSession * line.sessionCount;
      const existing = toDeduct.get(item.productId);
      if (existing) {
        existing.qty += total;
      } else {
        toDeduct.set(item.productId, { qty: total, trackBatches: item.product.trackBatches });
      }
    }
  }

  if (toDeduct.size === 0) return;

  const warehouseId = await getDefaultWarehouseId(tx, branchId);

  for (const [productId, { qty, trackBatches }] of toDeduct) {
    // Ensure the stock row exists, then atomically decrement.
    await tx.inventoryStock.upsert({
      where: { warehouseId_productId: { warehouseId, productId } },
      create: { branchId, warehouseId, productId, quantity: 0 },
      update: {},
    });
    const updated = await tx.inventoryStock.update({
      where: { warehouseId_productId: { warehouseId, productId } },
      data: { quantity: { decrement: qty } },
    });
    if (updated.quantity < 0) {
      throw Errors.conflict(
        `Insufficient stock: required ${qty}, available ${updated.quantity + qty}.`,
      );
    }
    if (trackBatches) {
      await depleteBatchStockFEFO(tx, { productId, warehouseId, quantity: qty });
    }
    await tx.inventoryMovement.create({
      data: {
        branchId,
        warehouseId,
        productId,
        type: 'service_consumption',
        delta: -qty,
        reason: 'Service booking consumption',
        ref: bookingRef,
        createdByAdminId: null,
      },
    });
  }
}

/**
 * Deduct (or restore) inventory for a list of service IDs — used when a
 * package session is completed or un-completed. Each service contributes 1
 * session's worth of inventory items.
 */
export async function applyServiceSessionStockByIds(
  tx: Tx,
  opts: {
    branchId: string;
    ref: string;
    serviceIds: string[];
    reverse?: boolean;
  },
): Promise<void> {
  const { branchId, ref, serviceIds, reverse = false } = opts;
  if (serviceIds.length === 0 || !branchId) return;

  const services = await tx.service.findMany({
    where: { id: { in: serviceIds }, isActive: true },
    select: {
      id: true,
      inventoryItems: {
        select: {
          productId: true,
          quantityPerSession: true,
          product: { select: { id: true, trackBatches: true } },
        },
      },
    },
  });

  const toDeduct = new Map<string, { qty: number; trackBatches: boolean }>();
  for (const svc of services) {
    for (const item of svc.inventoryItems) {
      const existing = toDeduct.get(item.productId);
      if (existing) {
        existing.qty += item.quantityPerSession;
      } else {
        toDeduct.set(item.productId, {
          qty: item.quantityPerSession,
          trackBatches: item.product.trackBatches,
        });
      }
    }
  }
  if (toDeduct.size === 0) return;

  const warehouseId = await getDefaultWarehouseId(tx, branchId);

  for (const [productId, { qty, trackBatches }] of toDeduct) {
    await tx.inventoryStock.upsert({
      where: { warehouseId_productId: { warehouseId, productId } },
      create: { branchId, warehouseId, productId, quantity: 0 },
      update: {},
    });

    if (reverse) {
      await tx.inventoryStock.update({
        where: { warehouseId_productId: { warehouseId, productId } },
        data: { quantity: { increment: qty } },
      });
    } else {
      const updated = await tx.inventoryStock.update({
        where: { warehouseId_productId: { warehouseId, productId } },
        data: { quantity: { decrement: qty } },
      });
      if (updated.quantity < 0) {
        throw Errors.conflict(
          `Insufficient stock: required ${qty}, available ${updated.quantity + qty}.`,
        );
      }
      if (trackBatches) {
        await depleteBatchStockFEFO(tx, { productId, warehouseId, quantity: qty });
      }
    }

    await tx.inventoryMovement.create({
      data: {
        branchId,
        warehouseId,
        productId,
        type: 'service_consumption',
        delta: reverse ? qty : -qty,
        reason: reverse ? 'Package session reversal' : 'Package session consumption',
        ref,
        createdByAdminId: null,
      },
    });
  }
}
