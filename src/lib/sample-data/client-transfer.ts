/**
 * Dummy data for the Admin → Reports → Services → Client Transfer screen.
 *
 * Derived from the Sales Report sample, but only for receipts that carry a
 * session-based package (a "Products" row can't transfer). Each receipt
 * becomes one transfer to a sibling branch in the seeded list.
 */
import dayjs from 'dayjs';
import { SALES_REPORT_ROWS } from './sales-report';

export interface ClientTransferRow {
  key: string;
  transferDate: string;       // ISO yyyy-mm-dd
  clientName: string;
  mobileNumber: string;
  fromBranch: string;
  toBranch: string;
  packageDetails: string;
  category: string;
  sessionsUsed: number;
  sessionsRemaining: number;
  pendingAmount: number;      // paise
  transferredBy: string;
  reason: string;
}

const SIBLING_BRANCH: Record<string, string> = {
  'Jubilee Hills': 'Banjara Hills',
  'Banjara Hills': 'Jubilee Hills',
  'Bandra West': 'Powai',
  'Powai': 'Bandra West',
  'Koramangala': 'Indiranagar',
  'Indiranagar': 'Koramangala',
  'Connaught Place': 'Anna Nagar',
  'Anna Nagar': 'Connaught Place',
};

const TRANSFER_REASONS = [
  'Customer relocated within city',
  'Closer to new home address',
  'Preferred therapist available at the other branch',
  'Branch capacity / scheduling conflict',
  'Customer request — convenience',
  'Branch network move',
  'Equipment availability at destination branch',
  'Branch consolidation',
];

const TRANSFERRED_BY = [
  'Rohit Sharma',
  'Vikram Singh',
  'Meera Joshi',
  'Anita Reddy',
  'Priya Kapoor',
];

/** Parse total sessions from a package description (defaults to 1). */
function parseSessions(packageDetails: string): number {
  const m = packageDetails.match(/(\d+)\s*sessions?/i);
  if (m) return Number(m[1]);
  return 1;
}

function deriveRows(): ClientTransferRow[] {
  const rows: ClientTransferRow[] = [];
  let i = 0;
  for (const r of SALES_REPORT_ROWS) {
    // Only multi-session packages transfer — skip retail products and 1-shot consultations.
    const totalSessions = parseSessions(r.packageDetails);
    if (r.category === 'Products' || totalSessions <= 1) continue;

    const toBranch = SIBLING_BRANCH[r.branchName];
    if (!toBranch) continue;

    // Sessions used grows over time; clamp between 1 and totalSessions-1.
    const sessionsUsed = Math.max(1, Math.min(totalSessions - 1, (i * 3 + 2) % totalSessions));
    const sessionsRemaining = totalSessions - sessionsUsed;

    // Transfer date is 30-120 days after the receipt date, deterministic by i.
    const offsetDays = 30 + ((i * 17) % 91);
    const transferDate = dayjs(r.receiptDate).add(offsetDays, 'day').format('YYYY-MM-DD');

    rows.push({
      key: `${r.receiptNumber}::transfer`,
      transferDate,
      clientName: r.clientName,
      mobileNumber: r.mobileNumber,
      fromBranch: r.branchName,
      toBranch,
      packageDetails: r.packageDetails,
      category: r.category,
      sessionsUsed,
      sessionsRemaining,
      pendingAmount: r.balanceAmount,
      transferredBy: TRANSFERRED_BY[i % TRANSFERRED_BY.length],
      reason: TRANSFER_REASONS[i % TRANSFER_REASONS.length],
    });
    i += 1;
  }
  return rows;
}

export const CLIENT_TRANSFER_ROWS: ClientTransferRow[] = deriveRows();
