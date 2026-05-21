import type { LedgerGroup } from '@/lib/admin-ledgers';

export interface AdminLedger {
  id: string;
  name: string;
  group: LedgerGroup;
  /** Stored as integer paise. */
  openingBalance: number;
  balanceType: 'debit' | 'credit';
  description: string | null;
  gstNumber: string | null;
  isActive: boolean;
  createdBy: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}
