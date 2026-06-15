import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { Errors } from '@/lib/api/errors';

type Client = typeof db | Prisma.TransactionClient;

/** The branch's default warehouse id (falls back to any active warehouse). */
export async function getDefaultWarehouseId(client: Client, branchId: string): Promise<string> {
  const wh =
    (await client.warehouse.findFirst({ where: { branchId, isDefault: true }, orderBy: { createdAt: 'asc' }, select: { id: true } })) ??
    (await client.warehouse.findFirst({ where: { branchId, isActive: true }, orderBy: { createdAt: 'asc' }, select: { id: true } }));
  if (!wh) throw Errors.badRequest('This branch has no warehouse configured.');
  return wh.id;
}

/**
 * Resolve the warehouse to use for a stock operation. If a `warehouseId` is
 * supplied it must belong to `branchId`; otherwise the branch default is used.
 */
export async function resolveWarehouseId(
  client: Client,
  branchId: string,
  warehouseId?: string | null,
): Promise<string> {
  if (warehouseId) {
    const wh = await client.warehouse.findUnique({
      where: { id: warehouseId },
      select: { id: true, branchId: true },
    });
    if (!wh || wh.branchId !== branchId) {
      throw Errors.badRequest('Selected warehouse does not belong to this branch.');
    }
    return wh.id;
  }
  return getDefaultWarehouseId(client, branchId);
}
