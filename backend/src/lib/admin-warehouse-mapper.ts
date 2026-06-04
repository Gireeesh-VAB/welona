import { Prisma } from '@prisma/client';
import type { AdminWarehouse } from '@shared/types/admin-warehouse';

/** Relations every warehouse endpoint loads. (Kept out of route.ts — Next
 * route modules may only export request handlers.) */
export const warehouseInclude = {
  branch: true,
  _count: { select: { stocks: true } },
} satisfies Prisma.WarehouseInclude;

export type WarehouseWithRelations = Prisma.WarehouseGetPayload<{
  include: { branch: true; _count: { select: { stocks: true } } };
}>;

export function toAdminWarehouse(row: WarehouseWithRelations): AdminWarehouse {
  return {
    id: row.id,
    branch: { id: row.branch.id, name: row.branch.name, code: row.branch.code },
    name: row.name,
    code: row.code,
    isDefault: row.isDefault,
    isActive: row.isActive,
    productCount: row._count?.stocks ?? 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
