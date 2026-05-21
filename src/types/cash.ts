/** UI types for the cash-management modules. Money is integer minor units. */

export interface CashCount {
  id: string;
  countedAt: string;
  label: string | null;
  /** Map of denomination value -> count. */
  breakdown: Record<string, number>;
  total: number;
  note: string | null;
  createdAt: string;
}

export interface PettyCashEntry {
  id: string;
  entryDate: string;
  direction: string;
  category: string | null;
  description: string;
  amount: number;
  paidTo: string | null;
  reference: string | null;
  createdAt: string;
}

/** Petty cash list payload — entries plus running totals. */
export interface PettyCashData {
  entries: PettyCashEntry[];
  summary: { totalIn: number; totalOut: number; balance: number };
}

export interface Voucher {
  id: string;
  number: string;
  voucherType: string;
  voucherDate: string;
  party: string;
  amount: number;
  mode: string;
  narration: string | null;
  createdAt: string;
}

export interface DayClose {
  id: string;
  closeDate: string;
  openingCash: number;
  cashCollections: number;
  pettyCashIn: number;
  pettyCashOut: number;
  expectedCash: number;
  countedCash: number;
  difference: number;
  note: string | null;
  closedAt: string;
}

/** Computed cash position for a day, before it is closed. */
export interface DayCloseSummary {
  date: string;
  cashCollections: number;
  pettyCashIn: number;
  pettyCashOut: number;
  suggestedOpening: number;
  alreadyClosed: boolean;
  close: DayClose | null;
}
