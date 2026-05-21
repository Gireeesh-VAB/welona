/**
 * Dummy data for the Admin → Reports → Services → Weight Loss screen.
 *
 * Only Wellness-category enrolments produce a weight-loss programme row.
 * Start weight, current weight and target are simulated deterministically
 * from the client name + receipt index.
 */
import dayjs from 'dayjs';
import { SALES_REPORT_ROWS } from './sales-report';

export type WeightLossStatus = 'On Track' | 'Lagging' | 'Achieved' | 'Dropped';

export interface WeightLossRow {
  key: string;
  clientName: string;
  mobileNumber: string;
  branchName: string;
  programme: string;
  category: string;
  startDate: string;             // ISO yyyy-mm-dd
  startWeightKg: number;
  currentWeightKg: number;
  targetWeightKg: number;
  weightLossKg: number;          // start - current
  lossPct: number;               // (start - current) / start, 1 decimal
  status: WeightLossStatus;
  /** Receipt date (same as start date) — used by the date-range filter. */
  receiptDate: string;
}

const WELLNESS_PROGRAMMES = [
  'Annual Weight Management Plan',
  'Lifestyle & Metabolic Programme',
  '12-week Reset Plan',
  'Pre-diabetes Reversal Programme',
];

function deriveRows(): WeightLossRow[] {
  const today = dayjs('2026-05-21');
  const rows: WeightLossRow[] = [];
  let idx = 0;
  for (const r of SALES_REPORT_ROWS) {
    if (r.category !== 'Wellness') continue;

    // Deterministic numbers from the client name + idx.
    const seed = r.clientName
      .split('')
      .reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) >>> 0, idx);
    const startWeight = 70 + (seed % 40);          // 70..109 kg
    const targetLossKg = 6 + (seed % 9);            // 6..14 kg
    const targetWeight = startWeight - targetLossKg;
    const monthsIn = Math.max(1, today.diff(dayjs(r.receiptDate), 'month'));
    // Loss accrues ~0.6kg / month, capped by target.
    const idealLoss = Math.min(targetLossKg, monthsIn * 0.6);
    const variance = ((seed >> 4) % 7) / 10 - 0.3;  // -0.3..0.3
    const actualLoss = Math.max(0, idealLoss + variance);
    const currentWeight = +(startWeight - actualLoss).toFixed(1);
    const lossKg = +(startWeight - currentWeight).toFixed(1);
    const lossPct = startWeight === 0 ? 0 : +((lossKg / startWeight) * 100).toFixed(1);

    let status: WeightLossStatus;
    if (currentWeight <= targetWeight) status = 'Achieved';
    else if (lossKg >= idealLoss * 0.85) status = 'On Track';
    else if (lossKg < idealLoss * 0.5 && monthsIn > 6) status = 'Dropped';
    else status = 'Lagging';

    rows.push({
      key: r.receiptNumber,
      clientName: r.clientName,
      mobileNumber: r.mobileNumber,
      branchName: r.branchName,
      programme: WELLNESS_PROGRAMMES[idx % WELLNESS_PROGRAMMES.length],
      category: r.category,
      startDate: r.receiptDate,
      startWeightKg: startWeight,
      currentWeightKg: currentWeight,
      targetWeightKg: targetWeight,
      weightLossKg: lossKg,
      lossPct,
      status,
      receiptDate: r.receiptDate,
    });
    idx += 1;
  }
  return rows;
}

export const WEIGHT_LOSS_ROWS: WeightLossRow[] = deriveRows();
