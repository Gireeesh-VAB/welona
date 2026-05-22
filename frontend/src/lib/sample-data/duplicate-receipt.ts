/**
 * Dummy data for the Admin → Reports → Sales → Duplicate Receipt screen.
 *
 * Derived from the Sales Report sample. Each receipt is enriched with the
 * extra identifiers shown on the duplicate-receipt view (CustomerId,
 * BillingId, Payment No, Serviced By, TotalDiscountAmount).
 */
import { SALES_REPORT_ROWS } from './sales-report';

export interface DuplicateReceiptRow {
  key: string;
  customerId: string;
  billingId: string;
  customerName: string;
  mobileNumber: string;
  receiptNumber: string;
  paymentNo: string;
  pendingAmount: number;
  netBillingAmount: number;
  paidAmount: number;
  totalDiscountAmount: number;
  category: string;
  /** Branch — used for filtering, not shown in the detail view. */
  branchName: string;
  /** Receipt date — used by the date-range filter. */
  receiptDate: string;
  servicedBy: string;
}

const SERVICED_BY_BY_CATEGORY: Record<string, string> = {
  'Skin Services': 'Dr. Priya Kapoor',
  'LASER': 'Karthik Iyer',
  'Hair Care': 'Dr. Rajesh Kumar',
  'Products': 'Divya Rao',
  'Wellness': 'Vikram Singh',
};

/** Build a stable customerId from the client name. */
function makeCustomerId(clientName: string, idx: number): string {
  const hash = clientName
    .split('')
    .reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) >>> 0, 0);
  return `CUST-${(hash % 9000 + 1000).toString()}-${(idx + 1).toString().padStart(3, '0')}`;
}

function deriveRows(): DuplicateReceiptRow[] {
  return SALES_REPORT_ROWS.map((r, idx) => {
    const total = r.packageAmount + r.taxAmount;
    // Simulate discount as 0-10% of package amount.
    const discountPct = (idx * 7) % 11; // 0..10
    const discount = Math.round((r.packageAmount * discountPct) / 100);
    return {
      key: r.receiptNumber,
      customerId: makeCustomerId(r.clientName, idx),
      billingId: `BILL-${r.receiptNumber.replace('RCP-', '')}`,
      customerName: r.clientName,
      mobileNumber: r.mobileNumber,
      receiptNumber: r.receiptNumber,
      paymentNo: `PAY-${r.receiptNumber.replace('RCP-', '')}`,
      pendingAmount: r.balanceAmount,
      netBillingAmount: total,
      paidAmount: r.paidAmount,
      totalDiscountAmount: discount,
      category: r.category,
      branchName: r.branchName,
      receiptDate: r.receiptDate,
      servicedBy: SERVICED_BY_BY_CATEGORY[r.category] ?? 'Front Desk',
    };
  });
}

export const DUPLICATE_RECEIPT_ROWS: DuplicateReceiptRow[] = deriveRows();
