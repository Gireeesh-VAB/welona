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

function effectiveUom(p: { uom: string; consumptionUom: string | null }): string {
  return p.consumptionUom ?? p.uom;
}

function isConsumable(p: { consumptionUom: string | null; unitsPerPurchase: number }): boolean {
  return !!(p.consumptionUom) && p.unitsPerPurchase > 1;
}

/**
 * FIFO deduction for a consumable product.
 * Draws from the oldest open ConsumableUnit, spilling into the next sealed one if needed.
 * When a unit is exhausted, InventoryStock decrements by 1 purchase unit.
 */
async function applyConsumableUsage(
  tx: Tx,
  opts: {
    productId: string;
    branchId: string;
    quantityUsed: number;
    bookingId: string | null;
    sessionRef: string | null;
    force?: boolean;
  },
): Promise<void> {
  const { productId, branchId, quantityUsed, bookingId, sessionRef, force } = opts;
  let remaining = quantityUsed;

  while (remaining > 0) {
    // Find currently open unit (FIFO — oldest first).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let unit = await (tx as any).consumableUnit.findFirst({
      where: { productId, branchId, status: 'open' },
      orderBy: { createdAt: 'asc' },
    });

    if (!unit) {
      // Open the oldest sealed unit.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sealed = await (tx as any).consumableUnit.findFirst({
        where: { productId, branchId, status: 'sealed' },
        orderBy: { createdAt: 'asc' },
      });
      if (!sealed) {
        if (force) break;
        throw Errors.conflict(`No stock available for product (no consumable units remaining).`);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      unit = await (tx as any).consumableUnit.update({
        where: { id: sealed.id },
        data: { status: 'open', openedAt: new Date() },
      });
    }

    const unitRemaining = unit.totalCapacity - unit.usedQuantity;
    const toDeduct = Math.min(remaining, unitRemaining);

    if (toDeduct >= unitRemaining) {
      // This unit is now exhausted.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (tx as any).consumableUnit.update({
        where: { id: unit.id },
        data: { usedQuantity: unit.totalCapacity, status: 'exhausted', exhaustedAt: new Date() },
      });
      // Decrement stock by 1 purchase unit.
      await tx.inventoryStock.updateMany({
        where: { warehouseId: unit.warehouseId, productId },
        data: { quantity: { decrement: 1 } },
      });
      await tx.inventoryMovement.create({
        data: {
          branchId,
          warehouseId: unit.warehouseId,
          productId,
          type: 'service_consumption',
          delta: -1,
          reason: `Consumable unit exhausted (${unit.totalCapacity} ${unit.totalCapacity === 1 ? 'unit' : 'units'} consumed)`,
          ref: sessionRef,
          createdByAdminId: null,
        },
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (tx as any).consumableUnit.update({
        where: { id: unit.id },
        data: { usedQuantity: { increment: toDeduct } },
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (tx as any).consumableUsageLog.create({
      data: {
        consumableUnitId: unit.id,
        branchId,
        bookingId,
        sessionRef,
        quantityUsed: toDeduct,
      },
    });

    remaining -= toDeduct;
  }
}

/**
 * Reverse FIFO usage for a given sessionRef — used when a package session is un-completed.
 * Finds all ConsumableUsageLog rows for this sessionRef and reverses them.
 */
async function reverseConsumableUsage(
  tx: Tx,
  opts: { productId: string; branchId: string; sessionRef: string },
): Promise<void> {
  const { productId, branchId, sessionRef } = opts;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const logs = await (tx as any).consumableUsageLog.findMany({
    where: { branchId, sessionRef },
    include: { consumableUnit: true },
    orderBy: { createdAt: 'desc' },
  });

  for (const log of logs) {
    if ((log.consumableUnit as any).productId !== productId) continue;
    const unit = log.consumableUnit as any;
    if (unit.status === 'exhausted') {
      // Reopen the unit and restore stock.
      await (tx as any).consumableUnit.update({
        where: { id: unit.id },
        data: {
          usedQuantity: { decrement: log.quantityUsed },
          status: 'open',
          exhaustedAt: null,
        },
      });
      await tx.inventoryStock.updateMany({
        where: { warehouseId: unit.warehouseId, productId },
        data: { quantity: { increment: 1 } },
      });
    } else {
      await (tx as any).consumableUnit.update({
        where: { id: unit.id },
        data: { usedQuantity: { decrement: log.quantityUsed } },
      });
    }
    await (tx as any).consumableUsageLog.delete({ where: { id: log.id } });
  }
}

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
          product: { select: { name: true, uom: true, consumptionUom: true, unitsPerPurchase: true } },
        },
      },
    },
  });

  if (services.length === 0) return [];

  const serviceMap = new Map(services.map((s) => [s.name, s]));

  const required = new Map<
    string,
    { name: string; uom: string; qty: number; consumable: boolean }
  >();
  for (const line of lines) {
    const svc = serviceMap.get(line.serviceName);
    if (!svc || svc.inventoryItems.length === 0) continue;
    for (const item of svc.inventoryItems) {
      const total = item.quantityPerSession * line.sessionCount;
      const existing = required.get(item.productId);
      if (existing) {
        existing.qty += total;
      } else {
        required.set(item.productId, {
          name: item.product.name,
          uom: effectiveUom(item.product as any),
          qty: total,
          consumable: isConsumable(item.product as any),
        });
      }
    }
  }

  if (required.size === 0) return [];

  const wh =
    (await tx.warehouse.findFirst({ where: { branchId, isDefault: true }, select: { id: true } })) ??
    (await tx.warehouse.findFirst({ where: { branchId, isActive: true }, select: { id: true } }));
  if (!wh) return [];

  const shortfalls: StockShortfall[] = [];

  for (const [productId, { name, uom, qty, consumable }] of required) {
    if (consumable) {
      // Available = sum of remaining capacity across open/sealed units.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const units = await (tx as any).consumableUnit.findMany({
        where: { productId, branchId, status: { in: ['sealed', 'open'] } },
        select: { totalCapacity: true, usedQuantity: true },
      });
      const available = (units as any[]).reduce(
        (sum: number, u: any) => sum + (u.totalCapacity - u.usedQuantity),
        0,
      );
      if (available < qty) {
        shortfalls.push({ productId, productName: name, productUom: uom, required: qty, available });
      }
    } else {
      const stock = await tx.inventoryStock.findFirst({
        where: { warehouseId: wh.id, productId },
        select: { quantity: true },
      });
      const available = stock?.quantity ?? 0;
      if (available < qty) {
        shortfalls.push({ productId, productName: name, productUom: uom, required: qty, available });
      }
    }
  }

  return shortfalls;
}

export async function applyServiceSessionStock(
  tx: Tx,
  opts: { branchId: string; orgId: string; bookingRef: string; lines: ServiceSessionLine[]; force?: boolean },
): Promise<void> {
  const { branchId, bookingRef, lines, force } = opts;
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
          product: { select: { id: true, trackBatches: true, consumptionUom: true, unitsPerPurchase: true } },
        },
      },
    },
  });

  const serviceMap = new Map(services.map((s) => [s.name, s]));

  const toDeduct = new Map<
    string,
    { qty: number; trackBatches: boolean; consumable: boolean }
  >();
  for (const line of lines) {
    const svc = serviceMap.get(line.serviceName);
    if (!svc || svc.inventoryItems.length === 0) continue;
    for (const item of svc.inventoryItems) {
      const total = item.quantityPerSession * line.sessionCount;
      const existing = toDeduct.get(item.productId);
      if (existing) {
        existing.qty += total;
      } else {
        toDeduct.set(item.productId, {
          qty: total,
          trackBatches: item.product.trackBatches,
          consumable: isConsumable(item.product as any),
        });
      }
    }
  }

  if (toDeduct.size === 0) return;

  const warehouseId = await getDefaultWarehouseId(tx, branchId);

  for (const [productId, { qty, trackBatches, consumable }] of toDeduct) {
    if (consumable) {
      await applyConsumableUsage(tx, {
        productId,
        branchId,
        quantityUsed: qty,
        bookingId: bookingRef,
        sessionRef: bookingRef,
        force,
      });
    } else {
      await tx.inventoryStock.upsert({
        where: { warehouseId_productId: { warehouseId, productId } },
        create: { branchId, warehouseId, productId, quantity: 0 },
        update: {},
      });
      const updated = await tx.inventoryStock.update({
        where: { warehouseId_productId: { warehouseId, productId } },
        data: { quantity: { decrement: qty } },
      });
      if (updated.quantity < 0 && !force) {
        throw Errors.conflict(
          `Insufficient stock: required ${qty}, available ${updated.quantity + qty}.`,
        );
      }
      if (trackBatches) {
        await depleteBatchStockFEFO(tx, { productId, warehouseId, quantity: qty, force: true });
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
}

export async function applyServiceSessionStockByIds(
  tx: Tx,
  opts: {
    branchId: string;
    ref: string;
    serviceIds: string[];
    reverse?: boolean;
    force?: boolean;
  },
): Promise<void> {
  const { branchId, ref, serviceIds, reverse = false, force = false } = opts;
  if (serviceIds.length === 0 || !branchId) return;

  const services = await tx.service.findMany({
    where: { id: { in: serviceIds }, isActive: true },
    select: {
      id: true,
      inventoryItems: {
        select: {
          productId: true,
          quantityPerSession: true,
          product: { select: { id: true, trackBatches: true, consumptionUom: true, unitsPerPurchase: true } },
        },
      },
    },
  });

  const toDeduct = new Map<
    string,
    { qty: number; trackBatches: boolean; consumable: boolean }
  >();
  for (const svc of services) {
    for (const item of svc.inventoryItems) {
      const existing = toDeduct.get(item.productId);
      if (existing) {
        existing.qty += item.quantityPerSession;
      } else {
        toDeduct.set(item.productId, {
          qty: item.quantityPerSession,
          trackBatches: item.product.trackBatches,
          consumable: isConsumable(item.product as any),
        });
      }
    }
  }
  if (toDeduct.size === 0) return;

  const warehouseId = await getDefaultWarehouseId(tx, branchId);

  for (const [productId, { qty, trackBatches, consumable }] of toDeduct) {
    if (consumable) {
      if (reverse) {
        await reverseConsumableUsage(tx, { productId, branchId, sessionRef: ref });
      } else {
        await applyConsumableUsage(tx, {
          productId,
          branchId,
          quantityUsed: qty,
          bookingId: null,
          sessionRef: ref,
          force,
        });
      }
    } else {
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
        if (updated.quantity < 0 && !force) {
          throw Errors.conflict(
            `Insufficient stock: required ${qty}, available ${updated.quantity + qty}.`,
          );
        }
        if (trackBatches) {
          await depleteBatchStockFEFO(tx, { productId, warehouseId, quantity: qty, force: true });
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
}
