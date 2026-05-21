/**
 * Dummy data for the Admin → Reports → Services → Success/Unsuccess screen.
 *
 * Derived from the Sales Report sample (multi-session and 1-session both
 * included). Treatment outcome is decided from completion progress and a
 * deterministic per-row jitter.
 */
import dayjs from 'dayjs';
import { SALES_REPORT_ROWS } from './sales-report';

export type TreatmentOutcome = 'Success' | 'Unsuccess' | 'Ongoing';

export interface SuccessUnsuccessRow {
  key: string;
  clientName: string;
  mobileNumber: string;
  branchName: string;
  category: string;
  treatment: string;
  totalSessions: number;
  sessionsDone: number;
  outcome: TreatmentOutcome;
  reason: string;
  /** Receipt date — used by the date-range filter. */
  receiptDate: string;
}

const SUCCESS_REASONS: Record<string, string[]> = {
  'Skin Services': [
    'Pigmentation cleared by session 4; client satisfied.',
    'Acne controlled — maintenance regimen prescribed.',
    'Skin tone visibly improved per follow-up photos.',
  ],
  'LASER': [
    'Target area cleared after planned sessions.',
    'Hair growth reduction within expected range.',
    'Customer reported full satisfaction on closure call.',
  ],
  'Hair Care': [
    'Hair density improved on trichoscope follow-up.',
    'Shedding reduced; client maintaining recommended diet.',
  ],
  'Products': [
    'Product course completed; customer reordered.',
  ],
  'Wellness': [
    'Target weight reached; lifestyle plan continued.',
    'Metabolic markers improved on follow-up tests.',
  ],
};

const UNSUCCESS_REASONS = [
  'Customer discontinued midway due to relocation.',
  'Inconsistent attendance; outcome could not be evaluated.',
  'No measurable improvement after agreed sessions.',
  'Adverse reaction; treatment paused on doctor advice.',
  'Refund issued — customer not satisfied with progress.',
];

const ONGOING_REASONS = [
  'Sessions in progress; on track per plan.',
  'Next review scheduled.',
  'Maintenance phase started.',
  'Awaiting follow-up appointment.',
];

function parseSessions(packageDetails: string): number {
  const m = packageDetails.match(/(\d+)\s*sessions?/i);
  return m ? Number(m[1]) : 1;
}

function deriveRows(): SuccessUnsuccessRow[] {
  const today = dayjs('2026-05-21');
  return SALES_REPORT_ROWS.map((r, idx) => {
    const total = parseSessions(r.packageDetails);
    const daysSinceStart = today.diff(dayjs(r.receiptDate), 'day');
    const expectedDone = Math.min(total, Math.max(1, Math.floor(daysSinceStart / 14) + 1));
    // Add a deterministic variation so some clients fall behind.
    const variance = ((idx * 11) % 5) - 2; // -2..2
    const sessionsDone = Math.max(0, Math.min(total, expectedDone + variance));

    let outcome: TreatmentOutcome;
    let reason: string;
    if (sessionsDone >= total) {
      // Most completed packages succeed; flag every 7th as unsuccessful.
      if (idx % 7 === 6) {
        outcome = 'Unsuccess';
        reason = UNSUCCESS_REASONS[idx % UNSUCCESS_REASONS.length];
      } else {
        outcome = 'Success';
        const pool = SUCCESS_REASONS[r.category] ?? SUCCESS_REASONS['Wellness'];
        reason = pool[idx % pool.length];
      }
    } else if (sessionsDone === 0 || (idx % 9 === 4 && daysSinceStart > 180)) {
      outcome = 'Unsuccess';
      reason = UNSUCCESS_REASONS[idx % UNSUCCESS_REASONS.length];
    } else {
      outcome = 'Ongoing';
      reason = ONGOING_REASONS[idx % ONGOING_REASONS.length];
    }

    return {
      key: r.receiptNumber,
      clientName: r.clientName,
      mobileNumber: r.mobileNumber,
      branchName: r.branchName,
      category: r.category,
      treatment: r.packageDetails,
      totalSessions: total,
      sessionsDone,
      outcome,
      reason,
      receiptDate: r.receiptDate,
    };
  });
}

export const SUCCESS_UNSUCCESS_ROWS: SuccessUnsuccessRow[] = deriveRows();
