import type { State } from '@prisma/client';
import type { AdminState } from '@shared/types/admin-state';

export function toAdminState(row: State): AdminState {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
