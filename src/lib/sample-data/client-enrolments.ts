/**
 * Dummy data for the Admin → Reports → Services → Client Enrolments screen.
 *
 * Derived from the Sales Report sample. Adds the Client ID, Gender and
 * "Booked By" fields specific to the enrolments view. Tax / Excl-tax / Paid /
 * Balance are split from the sales-report figures.
 */
import { SALES_REPORT_ROWS } from './sales-report';

export interface ClientEnrolmentRow {
  key: string;
  clientId: string;
  branchName: string;
  clientName: string;
  gender: 'Male' | 'Female';
  mobileNumber: string;
  packageDetails: string;
  bookedBy: string;
  packageExclTax: number;     // paise — package amount before tax
  taxAmount: number;          // paise
  paidAmount: number;         // paise
  balanceAmount: number;      // paise
  /** Category — used for filtering. */
  category: string;
  /** Enrolment date (= receipt date) — used by the date-range filter. */
  enrolmentDate: string;
}

/**
 * Heuristic Indian first-name → gender mapping for the seeded clients.
 * Falls back to a deterministic hash for any name not listed.
 */
const GENDER_BY_FIRST_NAME: Record<string, 'Male' | 'Female'> = {
  Aarav: 'Male',     Priya: 'Female',  Karthik: 'Male',  Anita: 'Female',
  Vikram: 'Male',    Meera: 'Female',  Arjun: 'Male',    Sneha: 'Female',
  Rajesh: 'Male',    Divya: 'Female',  Rohan: 'Male',    Sahil: 'Male',
  Deepak: 'Male',    Pooja: 'Female',  Neha: 'Female',   Rahul: 'Male',
  Ishita: 'Female',  Manish: 'Male',   Karan: 'Male',    Tanvi: 'Female',
};

function deriveGender(clientName: string): 'Male' | 'Female' {
  const first = clientName.split(' ')[0];
  if (GENDER_BY_FIRST_NAME[first]) return GENDER_BY_FIRST_NAME[first];
  const hash = first
    .split('')
    .reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) >>> 0, 0);
  return hash % 2 === 0 ? 'Female' : 'Male';
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

function makeClientId(clientName: string, idx: number): string {
  const hash = clientName
    .split('')
    .reduce((acc, c) => (acc * 33 + c.charCodeAt(0)) >>> 0, 0);
  return `CLI-${(hash % 9000 + 1000).toString()}-${(idx + 1).toString().padStart(3, '0')}`;
}

function deriveRows(): ClientEnrolmentRow[] {
  return SALES_REPORT_ROWS.map((r, idx) => ({
    key: r.receiptNumber,
    clientId: makeClientId(r.clientName, idx),
    branchName: r.branchName,
    clientName: r.clientName,
    gender: deriveGender(r.clientName),
    mobileNumber: r.mobileNumber,
    packageDetails: r.packageDetails,
    bookedBy: BOOKED_BY_BY_BRANCH[r.branchName] ?? 'Front Desk',
    packageExclTax: r.packageAmount,
    taxAmount: r.taxAmount,
    paidAmount: r.paidAmount,
    balanceAmount: r.balanceAmount,
    category: r.category,
    enrolmentDate: r.receiptDate,
  }));
}

export const CLIENT_ENROLMENT_ROWS: ClientEnrolmentRow[] = deriveRows();
