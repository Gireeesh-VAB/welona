import type { Prisma } from '@prisma/client';
import type { AdminLedger } from '@shared/types/admin-ledger';
import type { LedgerGroup } from '@shared/schemas/admin-ledgers';

export type LedgerWithRelations = Prisma.LedgerGetPayload<{
  include: { createdByAdmin: true };
}>;

export function toAdminLedger(row: LedgerWithRelations): AdminLedger {
  return {
    id: row.id,
    name: row.name,
    group: row.group as LedgerGroup,
    openingBalance: row.openingBalance,
    balanceType: row.balanceType as 'debit' | 'credit',
    description: row.description,
    gstNumber: row.gstNumber,
    isActive: row.isActive,
    createdBy: row.createdByAdmin
      ? {
          id: row.createdByAdmin.id,
          name: row.createdByAdmin.name,
          email: row.createdByAdmin.email,
        }
      : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
