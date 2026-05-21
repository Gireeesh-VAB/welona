/**
 * Dummy data for the Admin → Reports → Services → Client Regularity screen.
 *
 * Derived from the Sales Report sample. Tracks how reliably each client has
 * shown up to their scheduled sessions.
 */
import dayjs from 'dayjs';
import { SALES_REPORT_ROWS } from './sales-report';

export type RegularityStatus = 'Regular' | 'Irregular' | 'Dropped';

export interface ClientRegularityRow {
  key: string;
  clientName: string;
  mobileNumber: string;
  branchName: string;
  packageDetails: string;
  category: string;
  scheduled: number;
  attended: number;
  missed: number;
  rescheduled: number;
  attendancePct: number;     // 0..100, integer
  lastVisit: string;         // ISO yyyy-mm-dd
  status: RegularityStatus;
  /** Receipt date — used by the date-range filter. */
  receiptDate: string;
}

function parseSessions(packageDetails: string): number {
  const m = packageDetails.match(/(\d+)\s*sessions?/i);
  return m ? Number(m[1]) : 1;
}

function deriveRows(): ClientRegularityRow[] {
  const today = dayjs('2026-05-21');
  const rows: ClientRegularityRow[] = [];
  SALES_REPORT_ROWS.forEach((r, idx) => {
    const total = parseSessions(r.packageDetails);
    if (total <= 1 || r.category === 'Products') return;

    const daysSinceStart = today.diff(dayjs(r.receiptDate), 'day');
    const scheduled = Math.min(total, Math.max(1, Math.floor(daysSinceStart / 14)));

    // Deterministic attendance pattern based on the row index.
    const missedRate = (idx * 13) % 100; // 0..99
    const rescheduledRate = (idx * 7) % 50; // 0..49

    const missed = Math.min(scheduled - 1, Math.floor((scheduled * missedRate) / 100));
    const rescheduled = Math.min(scheduled - missed, Math.floor((scheduled * rescheduledRate) / 100));
    const attended = scheduled - missed - rescheduled;
    const pct = scheduled === 0 ? 0 : Math.round((attended / scheduled) * 100);

    const lastVisit = attended === 0
      ? r.receiptDate
      : dayjs(r.receiptDate).add(Math.min(daysSinceStart, attended * 14), 'day').format('YYYY-MM-DD');
    const daysSinceLast = today.diff(dayjs(lastVisit), 'day');

    let status: RegularityStatus;
    if (daysSinceLast > 90) status = 'Dropped';
    else if (pct >= 75) status = 'Regular';
    else status = 'Irregular';

    rows.push({
      key: r.receiptNumber,
      clientName: r.clientName,
      mobileNumber: r.mobileNumber,
      branchName: r.branchName,
      packageDetails: r.packageDetails,
      category: r.category,
      scheduled, attended, missed, rescheduled,
      attendancePct: pct,
      lastVisit,
      status,
      receiptDate: r.receiptDate,
    });
  });
  return rows;
}

export const CLIENT_REGULARITY_ROWS: ClientRegularityRow[] = deriveRows();
