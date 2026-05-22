/**
 * Dummy data for the Admin → Reports → Sales → Revenue screen.
 *
 * Derived from the Sales Report sample so the two screens stay consistent: a
 * single receipt in `sales-report` produces one Revenue row per non-zero
 * payment column. Tax is split proportionally between the payment methods.
 */
import { SALES_REPORT_ROWS, type SalesReportRow } from './sales-report';

export interface RevenueRow {
  /** Stable key, e.g. `${receiptNumber}::${payMode}`. */
  key: string;
  payMode: string;
  branchName: string;
  receiptNumber: string;
  mobileNumber: string;
  receiptDate: string;
  customerName: string;
  packageDetails: string;
  /** Free-form descriptor (consultant / channel / note). */
  details: string;
  packageCategory: string;
  /** Paid amount excluding tax — paise. */
  paidExclTax: number;
  /** Paid amount including tax — paise. */
  paidInclTax: number;
  /** Tax component of this payment — paise. */
  taxAmount: number;
}

const PAY_MODE_LABELS: Record<string, string> = {
  cash: 'Cash',
  creditCards: 'Credit Card',
  officeScan: 'Office Scan',
  cheque: 'Cheque',
  bajaj: 'Bajaj',
  ezFinanz: 'EzFinanz',
  saveIn: 'SaveIn',
  shopse: 'Shopse',
  fibe: 'Fibe',
};

const PAY_MODE_KEYS = Object.keys(PAY_MODE_LABELS) as Array<
  keyof Pick<
    SalesReportRow,
    'cash' | 'creditCards' | 'officeScan' | 'cheque' | 'bajaj' | 'ezFinanz' | 'saveIn' | 'shopse' | 'fibe'
  >
>;

const DETAILS_BY_CATEGORY: Record<string, string> = {
  'Skin Services': 'Consultant: Dr. Priya Kapoor',
  'LASER': 'Therapist: Karthik Iyer',
  'Hair Care': 'Trichologist: Dr. Rajesh Kumar',
  'Products': 'Retail counter sale',
  'Wellness': 'Programme: Annual Wellness Plan',
};

function deriveRevenueRows(): RevenueRow[] {
  const rows: RevenueRow[] = [];
  for (const r of SALES_REPORT_ROWS) {
    const totalInclTax = r.packageAmount + r.taxAmount;
    // Effective tax fraction of every rupee paid for this receipt.
    const taxFraction = totalInclTax > 0 ? r.taxAmount / totalInclTax : 0;
    for (const key of PAY_MODE_KEYS) {
      const paid = r[key];
      if (paid <= 0) continue;
      const taxComponent = Math.round(paid * taxFraction);
      rows.push({
        key: `${r.receiptNumber}::${key}`,
        payMode: PAY_MODE_LABELS[key],
        branchName: r.branchName,
        receiptNumber: r.receiptNumber,
        mobileNumber: r.mobileNumber,
        receiptDate: r.receiptDate,
        customerName: r.clientName,
        packageDetails: r.packageDetails,
        details: DETAILS_BY_CATEGORY[r.category] ?? '—',
        packageCategory: r.category,
        paidInclTax: paid,
        taxAmount: taxComponent,
        paidExclTax: paid - taxComponent,
      });
    }
  }
  return rows;
}

export const REVENUE_ROWS: RevenueRow[] = deriveRevenueRows();
