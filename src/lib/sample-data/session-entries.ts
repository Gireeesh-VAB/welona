/**
 * Dummy data for the Admin → Reports → Services → Session Entries screen.
 *
 * Each multi-session sales-report receipt expands into one row per session,
 * spaced ~14 days apart. Outcome is mostly "Completed", with occasional
 * Cancelled / No-Show entries for realism.
 */
import dayjs from 'dayjs';
import { SALES_REPORT_ROWS } from './sales-report';

export type SessionOutcome = 'Completed' | 'Cancelled' | 'No-Show';

export interface SessionEntryRow {
  key: string;
  sessionDate: string;     // ISO yyyy-mm-dd
  branchName: string;
  clientName: string;
  mobileNumber: string;
  service: string;
  category: string;
  therapist: string;
  durationMins: number;
  notes: string;
  outcome: SessionOutcome;
}

const THERAPIST_BY_CATEGORY: Record<string, string[]> = {
  'Skin Services': ['Dr. Priya Kapoor', 'Dr. Rajesh Kumar'],
  'LASER': ['Karthik Iyer', 'Arjun Mehta'],
  'Hair Care': ['Dr. Rajesh Kumar', 'Karthik Iyer'],
  'Wellness': ['Vikram Singh', 'Meera Joshi'],
  'Products': ['Divya Rao'],
};

const SESSION_NOTES = [
  'No adverse reaction; tolerated well.',
  'Mild erythema; resolved within 24 hrs.',
  'Customer reports visible improvement.',
  'Therapist recommended one extra session.',
  'Patch test cleared before procedure.',
  'Numbing cream applied prior to session.',
  'Photos taken for progress tracking.',
  'Maintenance products dispatched.',
];

function parseSessions(packageDetails: string): number {
  const m = packageDetails.match(/(\d+)\s*sessions?/i);
  return m ? Number(m[1]) : 1;
}

function pickOutcome(idx: number): SessionOutcome {
  const m = idx % 13;
  if (m === 5) return 'Cancelled';
  if (m === 9) return 'No-Show';
  return 'Completed';
}

function deriveRows(): SessionEntryRow[] {
  const today = dayjs('2026-05-21');
  const rows: SessionEntryRow[] = [];
  let idx = 0;
  for (const r of SALES_REPORT_ROWS) {
    const total = parseSessions(r.packageDetails);
    if (r.category === 'Products') continue;
    const daysSinceStart = today.diff(dayjs(r.receiptDate), 'day');
    const sessionsLogged = Math.min(total, Math.max(1, Math.floor(daysSinceStart / 14) + 1));
    const therapists = THERAPIST_BY_CATEGORY[r.category] ?? ['Front Desk'];

    for (let s = 0; s < sessionsLogged; s++) {
      const sessionDate = dayjs(r.receiptDate).add(s * 14, 'day').format('YYYY-MM-DD');
      if (dayjs(sessionDate).isAfter(today)) break;

      rows.push({
        key: `${r.receiptNumber}::s${s + 1}`,
        sessionDate,
        branchName: r.branchName,
        clientName: r.clientName,
        mobileNumber: r.mobileNumber,
        service: r.packageDetails,
        category: r.category,
        therapist: therapists[s % therapists.length],
        durationMins: r.category === 'LASER' ? 30 : r.category === 'Wellness' ? 60 : 45,
        notes: SESSION_NOTES[idx % SESSION_NOTES.length],
        outcome: pickOutcome(idx),
      });
      idx += 1;
    }
  }
  return rows;
}

export const SESSION_ENTRY_ROWS: SessionEntryRow[] = deriveRows();
