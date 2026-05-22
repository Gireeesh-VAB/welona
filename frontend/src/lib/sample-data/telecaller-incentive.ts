/**
 * Dummy data for the Admin → Reports → Incentives → Telecaller Report.
 *
 * Per-call view of telecaller activity with the collected amount attached
 * when the call ended in a booking. Calls that did not convert still appear
 * (with zero collected) so the page can compute the connect / conversion
 * rates correctly. The applied incentive percentage is a runtime input on
 * the page, not stored here.
 */
import { TELECALLER_CALL_ROWS } from './telecaller-calls';
import { SALES_REPORT_ROWS } from './sales-report';

export interface TelecallerIncentiveRow {
  key: string;
  callAt: string;
  telecaller: string;
  branchName: string;
  customerName: string;
  mobileNumber: string;
  callType: string;
  connectionStatus: string;
  outcome: string;
  durationMins: number;
  collectedAmount: number;       // paise — non-zero only when outcome = Booked
}

// Look up a booked call's collected amount by matching customer + branch in
// the sales-report sample. Falls back to a deterministic synthetic value.
function collectedFor(customerName: string, branchName: string, mobileNumber: string): number {
  const sale = SALES_REPORT_ROWS.find(
    (s) => s.clientName === customerName && s.branchName === branchName,
  );
  if (sale) return sale.paidAmount;

  // Deterministic fallback so re-runs produce the same numbers.
  const hash = (customerName + mobileNumber)
    .split('')
    .reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) >>> 0, 0);
  const rupees = 4000 + (hash % 36) * 1000; // 4,000..40,000
  return rupees * 100;
}

export const TELECALLER_INCENTIVE_ROWS: TelecallerIncentiveRow[] =
  TELECALLER_CALL_ROWS.map((r) => ({
    key: r.key,
    callAt: r.callAt,
    telecaller: r.telecaller,
    branchName: r.branchName,
    customerName: r.customerName,
    mobileNumber: r.mobileNumber,
    callType: r.callType,
    connectionStatus: r.connectionStatus,
    outcome: r.outcome,
    durationMins: r.durationMins,
    collectedAmount: r.outcome === 'Booked'
      ? collectedFor(r.customerName, r.branchName, r.mobileNumber)
      : 0,
  }));

/** Distinct telecallers in the dataset, alphabetically sorted. */
export const TELECALLER_LIST: string[] = Array.from(
  new Set(TELECALLER_INCENTIVE_ROWS.map((r) => r.telecaller)),
).sort();
