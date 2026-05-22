/**
 * Dummy data for the Admin → Reports → Incentives → EPM / Sales Incentive %.
 *
 * Derived from the Sales Report sample. Each receipt is treated as one
 * incentive-bearing booking. BookingType + EmployeeName are added in a
 * deterministic but varied way so the filters give visibly different
 * cohorts. The applied incentive percentage is a runtime input (filter on
 * the page), not stored on the row — the only money values stored here are
 * the package amount and collected amount.
 */

import { SALES_REPORT_ROWS } from './sales-report';

export type BookingType = 'New Sale' | 'Renewal' | 'Upgrade' | 'Walk-in' | 'Product';

export interface SalesIncentiveRow {
  key: string;
  bookingDate: string;          // ISO yyyy-mm-dd (= receipt date)
  bookingType: BookingType;
  employeeName: string;
  branchName: string;
  clientName: string;
  packageDetails: string;
  category: string;
  collectedAmount: number;      // paise — what the client actually paid
  packageAmount: number;        // paise — package price inclusive of tax
}

const EMPLOYEE_BY_BRANCH: Record<string, string> = {
  'Jubilee Hills': 'Rohit Sharma',
  'Banjara Hills': 'Divya Rao',
  'Bandra West': 'Karthik Iyer',
  'Powai': 'Meera Joshi',
  'Koramangala': 'Anita Reddy',
  'Indiranagar': 'Arjun Mehta',
  'Connaught Place': 'Vikram Singh',
  'Anna Nagar': 'Sneha Iyer',
};

/** Pick a booking type from category + index so types are spread realistically. */
function pickBookingType(category: string, idx: number): BookingType {
  if (category === 'Products') return 'Product';
  if (category === 'Wellness') return idx % 2 === 0 ? 'New Sale' : 'Renewal';
  if (category === 'LASER') {
    const m = idx % 5;
    if (m === 0) return 'Upgrade';
    if (m === 1) return 'Renewal';
    return 'New Sale';
  }
  // Skin Services / Hair Care
  const m = idx % 6;
  if (m === 0) return 'Walk-in';
  if (m === 1) return 'Upgrade';
  if (m === 2) return 'Renewal';
  return 'New Sale';
}

export const SALES_INCENTIVE_ROWS: SalesIncentiveRow[] = SALES_REPORT_ROWS.map(
  (r, idx) => ({
    key: r.receiptNumber,
    bookingDate: r.receiptDate,
    bookingType: pickBookingType(r.category, idx),
    employeeName: EMPLOYEE_BY_BRANCH[r.branchName] ?? 'Front Desk',
    branchName: r.branchName,
    clientName: r.clientName,
    packageDetails: r.packageDetails,
    category: r.category,
    collectedAmount: r.paidAmount,
    packageAmount: r.packageAmount + r.taxAmount,
  }),
);

/** Distinct employees that appear in the dataset, alphabetical. */
export const SALES_INCENTIVE_EMPLOYEES: string[] = Array.from(
  new Set(SALES_INCENTIVE_ROWS.map((r) => r.employeeName)),
).sort();

export const BOOKING_TYPES: BookingType[] = [
  'New Sale', 'Renewal', 'Upgrade', 'Walk-in', 'Product',
];
