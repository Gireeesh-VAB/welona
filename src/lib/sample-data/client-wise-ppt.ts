/**
 * Dummy data for the Admin → Reports → Sales → Client Wise PPT screen.
 *
 * Derived from the Sales Report sample. Adds the columns specific to this
 * report (Quantity, Booked By) and renames money fields to "Booked Amount".
 */
import { SALES_REPORT_ROWS } from './sales-report';

export interface ClientWisePptRow {
  key: string;
  clientName: string;
  joinedDate: string;
  phoneNumber: string;
  packageDetails: string;
  quantity: number;
  bookedAmount: number;
  paidAmount: number;
  balanceAmount: number;
  bookedByName: string;
  /** Branch — used for filtering. */
  branchName: string;
  /** Category — used for filtering. */
  category: string;
  /** Receipt date — used by the date-range filter. */
  receiptDate: string;
}

const BOOKED_BY_BY_BRANCH: Record<string, string> = {
  'Jubilee Hills': 'Rohit Sharma',
  'Banjara Hills': 'Divya Rao',
  'Bandra West': 'Karthik Iyer',
  'Powai': 'Meera Joshi',
  'Koramangala': 'Anita Reddy',
  'Indiranagar': 'Arjun Mehta',
  'Connaught Place': 'Vikram Singh',
  'Anna Nagar': 'Sneha Iyer',
};

/** Extract a quantity from a package description, defaulting to 1. */
function parseQuantity(packageDetails: string): number {
  // Match patterns like "6 sessions" or "× 4" or "(8 sessions)".
  const sessionMatch = packageDetails.match(/(\d+)\s*sessions?/i);
  if (sessionMatch) return Number(sessionMatch[1]);
  // Sum all "× N" multipliers (e.g. "Shampoo × 4 + Vitamins × 2" → 6).
  const multipliers = Array.from(packageDetails.matchAll(/×\s*(\d+)/g)).map((m) =>
    Number(m[1]),
  );
  if (multipliers.length > 0) return multipliers.reduce((a, b) => a + b, 0);
  return 1;
}

function deriveRows(): ClientWisePptRow[] {
  return SALES_REPORT_ROWS.map((r) => ({
    key: r.receiptNumber,
    clientName: r.clientName,
    joinedDate: r.joinedDate,
    phoneNumber: r.mobileNumber,
    packageDetails: r.packageDetails,
    quantity: parseQuantity(r.packageDetails),
    bookedAmount: r.packageAmount + r.taxAmount,
    paidAmount: r.paidAmount,
    balanceAmount: r.balanceAmount,
    bookedByName: BOOKED_BY_BY_BRANCH[r.branchName] ?? 'Front Desk',
    branchName: r.branchName,
    category: r.category,
    receiptDate: r.receiptDate,
  }));
}

export const CLIENT_WISE_PPT_ROWS: ClientWisePptRow[] = deriveRows();
