/**
 * Dummy data for the Admin → Reports → Sales → Balances Report screen.
 *
 * Derived from the Sales Report sample: every receipt with a non-zero
 * balance produces one Balance row. Due Date is the receipt date + 30 days.
 */
import dayjs from 'dayjs';
import { SALES_REPORT_ROWS } from './sales-report';

export interface BalanceRow {
  key: string;
  customerName: string;
  mobileNumber: string;
  category: string;
  /** Branch name — used for filtering, not shown in the detail view. */
  branchName: string;
  /** ISO date — receipt date + 30 days. */
  dueDate: string;
  /** Receipt date — used by the date-range filter. */
  receiptDate: string;
  /** Package + tax — paise. */
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
}

function deriveBalanceRows(): BalanceRow[] {
  return SALES_REPORT_ROWS.filter((r) => r.balanceAmount > 0).map((r) => ({
    key: r.receiptNumber,
    customerName: r.clientName,
    mobileNumber: r.mobileNumber,
    category: r.category,
    branchName: r.branchName,
    receiptDate: r.receiptDate,
    dueDate: dayjs(r.receiptDate).add(30, 'day').format('YYYY-MM-DD'),
    totalAmount: r.packageAmount + r.taxAmount,
    paidAmount: r.paidAmount,
    balanceAmount: r.balanceAmount,
  }));
}

export const BALANCE_ROWS: BalanceRow[] = deriveBalanceRows();
