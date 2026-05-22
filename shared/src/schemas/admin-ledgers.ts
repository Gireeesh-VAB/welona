import { z } from 'zod';

/**
 * Standard chart-of-accounts groups, Tally / Zoho Books style. The literal
 * union is enforced on both the API and the UI dropdown — keep them in sync
 * if you ever add a new group.
 */
export const LEDGER_GROUPS = [
  'sales',
  'purchase',
  'cash',
  'bank',
  'sundry_debtor',
  'sundry_creditor',
  'direct_expense',
  'indirect_expense',
  'direct_income',
  'indirect_income',
  'duties_taxes',
  'fixed_asset',
  'current_asset',
  'current_liability',
  'capital_account',
  'loans',
] as const;

export type LedgerGroup = (typeof LEDGER_GROUPS)[number];

/** Human-readable label for each group (used in dropdowns and the table). */
export const LEDGER_GROUP_LABELS: Record<LedgerGroup, string> = {
  sales: 'Sales',
  purchase: 'Purchase',
  cash: 'Cash',
  bank: 'Bank',
  sundry_debtor: 'Sundry Debtor',
  sundry_creditor: 'Sundry Creditor',
  direct_expense: 'Direct Expense',
  indirect_expense: 'Indirect Expense',
  direct_income: 'Direct Income',
  indirect_income: 'Indirect Income',
  duties_taxes: 'Duties & Taxes',
  fixed_asset: 'Fixed Asset',
  current_asset: 'Current Asset',
  current_liability: 'Current Liability',
  capital_account: 'Capital Account',
  loans: 'Loans',
};

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal('').transform(() => undefined));

export const adminLedgerCreateSchema = z.object({
  name: z.string().trim().min(1, 'Ledger name is required').max(120),
  group: z.enum(LEDGER_GROUPS),
  openingBalance: z.coerce.number().int().nonnegative().default(0),
  balanceType: z.enum(['debit', 'credit']).default('debit'),
  description: optionalText(300),
  gstNumber: optionalText(20),
  isActive: z.boolean().default(true),
});

export const adminLedgerUpdateSchema = adminLedgerCreateSchema.partial();

export const adminLedgerListQuerySchema = z.object({
  search: z.string().trim().optional(),
  group: z.enum(LEDGER_GROUPS).optional(),
  active: z.enum(['all', 'active', 'inactive']).default('all'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export type AdminLedgerCreateInput = z.infer<typeof adminLedgerCreateSchema>;
export type AdminLedgerUpdateInput = z.infer<typeof adminLedgerUpdateSchema>;
export type AdminLedgerListQuery = z.infer<typeof adminLedgerListQuerySchema>;
