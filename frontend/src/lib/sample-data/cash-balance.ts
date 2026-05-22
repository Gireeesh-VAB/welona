/**
 * Dummy data for the Admin → Reports → Cash → Cash Balance screen.
 *
 * A per-branch cash-position snapshot — for each branch, the latest opening
 * balance, the day's cash in/out, petty cash in/out, and the resulting
 * closing balance. Money is stored as integer paise.
 */

export interface CashBalanceRow {
  key: string;
  branchName: string;
  asOfDate: string;             // ISO yyyy-mm-dd
  openingBalance: number;
  cashReceipts: number;
  cashPayments: number;
  pettyCashIn: number;
  pettyCashOut: number;
  closingBalance: number;       // computed
  lastReconciledDate: string | null;
}

const r = (rupees: number) => rupees * 100;

interface BranchSpec {
  branchName: string;
  asOfDate: string;
  openingBalance: number;
  cashReceipts: number;
  cashPayments: number;
  pettyCashIn: number;
  pettyCashOut: number;
  lastReconciledDate: string | null;
}

const SPECS: BranchSpec[] = [
  { branchName: 'Jubilee Hills',   asOfDate: '2026-05-21', openingBalance: r(28000), cashReceipts: r(42500), cashPayments: r(6500),  pettyCashIn: r(2000), pettyCashOut: r(3800),  lastReconciledDate: '2026-05-20' },
  { branchName: 'Banjara Hills',   asOfDate: '2026-05-21', openingBalance: r(32000), cashReceipts: r(36000), cashPayments: r(4500),  pettyCashIn: r(1500), pettyCashOut: r(2900),  lastReconciledDate: '2026-05-20' },
  { branchName: 'Bandra West',     asOfDate: '2026-05-21', openingBalance: r(45000), cashReceipts: r(58500), cashPayments: r(12500), pettyCashIn: r(0),    pettyCashOut: r(5200),  lastReconciledDate: '2026-05-20' },
  { branchName: 'Powai',           asOfDate: '2026-05-21', openingBalance: r(22000), cashReceipts: r(28000), cashPayments: r(7000),  pettyCashIn: r(1000), pettyCashOut: r(2400),  lastReconciledDate: '2026-05-20' },
  { branchName: 'Koramangala',     asOfDate: '2026-05-21', openingBalance: r(38500), cashReceipts: r(51000), cashPayments: r(9500),  pettyCashIn: r(2500), pettyCashOut: r(4100),  lastReconciledDate: '2026-05-19' },
  { branchName: 'Indiranagar',     asOfDate: '2026-05-21', openingBalance: r(25000), cashReceipts: r(31500), cashPayments: r(5500),  pettyCashIn: r(1200), pettyCashOut: r(2800),  lastReconciledDate: '2026-05-20' },
  { branchName: 'Connaught Place', asOfDate: '2026-05-21', openingBalance: r(52000), cashReceipts: r(74000), cashPayments: r(18500), pettyCashIn: r(3000), pettyCashOut: r(6500),  lastReconciledDate: '2026-05-20' },
  { branchName: 'Anna Nagar',      asOfDate: '2026-05-21', openingBalance: r(19500), cashReceipts: r(22000), cashPayments: r(4200),  pettyCashIn: r(800),  pettyCashOut: r(1600),  lastReconciledDate: null },
];

export const CASH_BALANCE_ROWS: CashBalanceRow[] = SPECS.map((s, idx) => ({
  key: `CB-${idx + 1}`,
  branchName: s.branchName,
  asOfDate: s.asOfDate,
  openingBalance: s.openingBalance,
  cashReceipts: s.cashReceipts,
  cashPayments: s.cashPayments,
  pettyCashIn: s.pettyCashIn,
  pettyCashOut: s.pettyCashOut,
  closingBalance: s.openingBalance + s.cashReceipts + s.pettyCashIn - s.cashPayments - s.pettyCashOut,
  lastReconciledDate: s.lastReconciledDate,
}));
