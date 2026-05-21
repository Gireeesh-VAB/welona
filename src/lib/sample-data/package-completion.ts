/**
 * Dummy data for the Admin → Reports → Services → Package Completion screen.
 *
 * Derived from the Sales Report sample. Only multi-session packages are
 * tracked (single-shot products and 1-session consultations skipped). For
 * each package we simulate the sessions used so far based on how old the
 * receipt is — older receipts have more progress.
 */
import dayjs from 'dayjs';
import { SALES_REPORT_ROWS } from './sales-report';

export type CompletionStatus = 'Completed' | 'In Progress' | 'Stalled';

export interface PackageCompletionRow {
  key: string;
  clientName: string;
  mobileNumber: string;
  branchName: string;
  packageDetails: string;
  category: string;
  totalSessions: number;
  sessionsUsed: number;
  sessionsRemaining: number;
  completionPct: number;       // 0..100, integer
  lastSessionDate: string;     // ISO yyyy-mm-dd
  status: CompletionStatus;
  /** Receipt / enrolment date — used by the date-range filter. */
  receiptDate: string;
}

function parseSessions(packageDetails: string): number {
  const m = packageDetails.match(/(\d+)\s*sessions?/i);
  return m ? Number(m[1]) : 1;
}

function deriveRows(): PackageCompletionRow[] {
  const today = dayjs('2026-05-21');
  const rows: PackageCompletionRow[] = [];
  SALES_REPORT_ROWS.forEach((r, idx) => {
    const total = parseSessions(r.packageDetails);
    if (total <= 1 || r.category === 'Products') return;

    const daysSinceStart = today.diff(dayjs(r.receiptDate), 'day');
    // Rough simulation: 1 session every ~14 days, capped at total.
    const expectedUsed = Math.min(total, Math.floor(daysSinceStart / 14));
    // Add a small variation so not every record is identical.
    const variance = ((idx * 7) % 3) - 1; // -1, 0 or 1
    const used = Math.max(0, Math.min(total, expectedUsed + variance));
    const remaining = total - used;
    const pct = total === 0 ? 0 : Math.round((used / total) * 100);

    const lastSession = used === 0
      ? r.receiptDate
      : dayjs(r.receiptDate)
          .add(Math.min(daysSinceStart, used * 14), 'day')
          .format('YYYY-MM-DD');
    const daysSinceLast = today.diff(dayjs(lastSession), 'day');

    let status: CompletionStatus;
    if (remaining === 0) status = 'Completed';
    else if (daysSinceLast > 60) status = 'Stalled';
    else status = 'In Progress';

    rows.push({
      key: r.receiptNumber,
      clientName: r.clientName,
      mobileNumber: r.mobileNumber,
      branchName: r.branchName,
      packageDetails: r.packageDetails,
      category: r.category,
      totalSessions: total,
      sessionsUsed: used,
      sessionsRemaining: remaining,
      completionPct: pct,
      lastSessionDate: lastSession,
      status,
      receiptDate: r.receiptDate,
    });
  });
  return rows;
}

export const PACKAGE_COMPLETION_ROWS: PackageCompletionRow[] = deriveRows();
