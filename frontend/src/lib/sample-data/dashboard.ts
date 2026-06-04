/**
 * Aggregations that power the Admin → Dashboard page.
 *
 * Everything is derived from the per-module sample data files so a single
 * dashboard refresh feels internally consistent with the underlying reports.
 * "Today" is anchored at 2026-05-21 to match the rest of the seed.
 */
import dayjs from 'dayjs';
import { SALES_REPORT_ROWS } from './sales-report';
import { APPOINTMENTS, APPOINTMENTS_TODAY } from './appointments';
import { ENQUIRY_REPORT_ROWS } from './enquiry-report';
import { TELECALLER_CALL_ROWS } from './telecaller-calls';
import { WALK_IN_ROWS } from './walk-in-details';
import { EXPENSE_ROWS } from './expense-report';
import { WALLET } from './sms-integration';

export const TODAY = APPOINTMENTS_TODAY; // '2026-05-21'

/** Sum (paise) of total received money in the sample. */
export const TOTAL_REVENUE = SALES_REPORT_ROWS.reduce((s, r) => s + r.paidAmount, 0);
export const TOTAL_PACKAGE_VALUE = SALES_REPORT_ROWS.reduce(
  (s, r) => s + r.packageAmount + r.taxAmount, 0,
);
export const TOTAL_OUTSTANDING = SALES_REPORT_ROWS.reduce((s, r) => s + r.balanceAmount, 0);
export const TOTAL_EXPENSES = EXPENSE_ROWS.reduce((s, r) => s + r.amount, 0);

/** Distinct customers in the sale sample. */
export const TOTAL_CUSTOMERS = new Set(SALES_REPORT_ROWS.map((r) => r.clientName)).size;

/** Enquiries by status — used by the funnel and as raw KPI inputs. */
export const ENQUIRY_FUNNEL = (() => {
  const buckets = { New: 0, Contacted: 0, Qualified: 0, Converted: 0, Lost: 0 };
  for (const e of ENQUIRY_REPORT_ROWS) buckets[e.status] += 1;
  const converted = buckets.Converted;
  // Paid must be a subset of Converted to keep a proper funnel shape.
  const paid = Math.min(
    SALES_REPORT_ROWS.filter((r) => r.paidAmount > 0).length,
    converted,
  );
  // Funnel rows ordered top-to-bottom.
  return [
    { stage: 'Enquiries',  count: ENQUIRY_REPORT_ROWS.length },
    { stage: 'Contacted',  count: ENQUIRY_REPORT_ROWS.length - buckets.New },
    { stage: 'Qualified',  count: buckets.Qualified + converted },
    { stage: 'Converted',  count: converted },
    { stage: 'Paid',       count: paid },
  ];
})();

export const CONVERSION_RATE = (() => {
  const converted = ENQUIRY_REPORT_ROWS.filter((e) => e.status === 'Converted').length;
  return ENQUIRY_REPORT_ROWS.length === 0 ? 0
    : Math.round((converted / ENQUIRY_REPORT_ROWS.length) * 100);
})();

/** Revenue by month (last 6 months including current). */
export const REVENUE_BY_MONTH = (() => {
  const months: { label: string; key: string; revenue: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = dayjs(TODAY).subtract(i, 'month');
    months.push({
      label: d.format('MMM'),
      key: d.format('YYYY-MM'),
      revenue: 0,
    });
  }
  // Sample receipts cluster in the current month — spread historical revenue
  // proportionally so the line tells a believable story.
  const total = TOTAL_REVENUE;
  // Weights for months -5..0 (oldest -> current). Current month is current sample.
  const weights = [0.62, 0.71, 0.83, 0.88, 0.94, 1.00];
  const currentTotal = total;
  for (let i = 0; i < months.length - 1; i++) {
    months[i].revenue = Math.round(currentTotal * weights[i]);
  }
  months[months.length - 1].revenue = currentTotal;
  return months;
})();

/** Revenue & expense per branch (today's snapshot from sample). */
export const BRANCH_PERFORMANCE = (() => {
  const map = new Map<string, { branch: string; revenue: number; expenses: number; receipts: number }>();
  for (const r of SALES_REPORT_ROWS) {
    const e = map.get(r.branchName) ?? { branch: r.branchName, revenue: 0, expenses: 0, receipts: 0 };
    e.revenue += r.paidAmount;
    e.receipts += 1;
    map.set(r.branchName, e);
  }
  for (const x of EXPENSE_ROWS) {
    const e = map.get(x.branchName) ?? { branch: x.branchName, revenue: 0, expenses: 0, receipts: 0 };
    e.expenses += x.amount;
    map.set(x.branchName, e);
  }
  return Array.from(map.values())
    .sort((a, b) => b.revenue - a.revenue);
})();

/** Revenue mix by service category. */
export const CATEGORY_MIX = (() => {
  const map = new Map<string, number>();
  for (const r of SALES_REPORT_ROWS) {
    map.set(r.category, (map.get(r.category) ?? 0) + r.paidAmount);
  }
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
})();

/** Bookings (receipts) per weekday — Mon..Sun. */
export const WEEKDAY_BOOKINGS = (() => {
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const r of SALES_REPORT_ROWS) {
    // dayjs returns 0=Sun..6=Sat — re-map so Mon is 0.
    const dow = (dayjs(r.receiptDate).day() + 6) % 7;
    counts[dow] += 1;
  }
  return labels.map((l, i) => ({ day: l, count: counts[i] }));
})();

/** Top employees by revenue — derived from the Sales Incentive sample. */
export const TOP_EMPLOYEES = (() => {
  const map = new Map<string, { name: string; branch: string; bookings: number; revenue: number }>();
  // We re-use the BRANCH → employee mapping from the incentive seed.
  const EMP_BY_BRANCH: Record<string, string> = {
    'Jubilee Hills': 'Rohit Sharma',
    'Banjara Hills': 'Divya Rao',
    'Bandra West': 'Karthik Iyer',
    'Powai': 'Meera Joshi',
    'Koramangala': 'Anita Reddy',
    'Indiranagar': 'Arjun Mehta',
    'Connaught Place': 'Vikram Singh',
    'Anna Nagar': 'Sneha Iyer',
  };
  for (const r of SALES_REPORT_ROWS) {
    const name = EMP_BY_BRANCH[r.branchName] ?? 'Front Desk';
    const e = map.get(name) ?? { name, branch: r.branchName, bookings: 0, revenue: 0 };
    e.bookings += 1;
    e.revenue += r.paidAmount;
    map.set(name, e);
  }
  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
})();

/** Today's appointments — for the schedule widget. */
export const TODAY_APPOINTMENTS = APPOINTMENTS
  .filter((a) => dayjs(a.startsAt).format('YYYY-MM-DD') === TODAY)
  .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

/** Recent activity feed — top 6 mixed events. */
interface ActivityEvent {
  key: string;
  ts: string;
  kind: 'sale' | 'enquiry' | 'walk-in' | 'call' | 'expense';
  title: string;
  subtitle: string;
  amount?: number;
}
export const RECENT_ACTIVITY: ActivityEvent[] = (() => {
  const events: ActivityEvent[] = [];

  // Latest 3 receipts
  for (const r of [...SALES_REPORT_ROWS].sort((a, b) =>
    new Date(b.receiptDate).getTime() - new Date(a.receiptDate).getTime()).slice(0, 3)
  ) {
    events.push({
      key: `s-${r.receiptNumber}`,
      ts: r.receiptDate,
      kind: 'sale',
      title: `${r.clientName} paid for ${r.packageDetails.split('—')[0].trim()}`,
      subtitle: `${r.branchName} · ${r.receiptNumber}`,
      amount: r.paidAmount,
    });
  }
  // Latest 2 enquiries
  for (const e of [...ENQUIRY_REPORT_ROWS].sort((a, b) =>
    new Date(b.enquiryDate).getTime() - new Date(a.enquiryDate).getTime()).slice(0, 2)
  ) {
    events.push({
      key: `e-${e.key}`,
      ts: e.enquiryDate,
      kind: 'enquiry',
      title: `${e.customerName} enquired about ${e.treatmentInterest}`,
      subtitle: `${e.branchName} · ${e.source}`,
    });
  }
  // Latest 2 walk-ins
  for (const w of [...WALK_IN_ROWS].sort((a, b) =>
    new Date(b.walkInAt).getTime() - new Date(a.walkInAt).getTime()).slice(0, 2)
  ) {
    events.push({
      key: `w-${w.key}`,
      ts: w.walkInAt,
      kind: 'walk-in',
      title: `${w.customerName} walked in for ${w.treatmentInterest}`,
      subtitle: `${w.branchName} · attended by ${w.attendedBy}`,
    });
  }
  return events
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    .slice(0, 6);
})();

/** Telecaller activity snapshot for KPI sparkline & "calls today". */
export const TELECALLER_TODAY_CALLS = TELECALLER_CALL_ROWS.filter(
  (c) => dayjs(c.callAt).format('YYYY-MM-DD') === TODAY,
).length;

/** Operational alerts — small banner items above the activity feeds. */
export interface AlertItem {
  key: string;
  severity: 'info' | 'warning' | 'error';
  title: string;
  message: string;
}
export const ALERTS: AlertItem[] = (() => {
  const alerts: AlertItem[] = [];
  // SMS credits low
  if (WALLET.balanceCredits <= WALLET.lowBalanceThreshold * 10) {
    alerts.push({
      key: 'sms',
      severity: WALLET.balanceCredits <= WALLET.lowBalanceThreshold ? 'error' : 'warning',
      title: `SMS wallet: ${WALLET.balanceCredits.toLocaleString('en-IN')} credits left`,
      message: WALLET.balanceCredits <= WALLET.lowBalanceThreshold
        ? 'Below the low-balance threshold — recharge to avoid delivery failures.'
        : 'Watching the wallet — recharge in the next few days to be safe.',
    });
  }
  // High outstanding
  if (TOTAL_OUTSTANDING > 0) {
    alerts.push({
      key: 'outstanding',
      severity: TOTAL_OUTSTANDING > 5_000_00 ? 'warning' : 'info',
      title: `Outstanding balance: ${(TOTAL_OUTSTANDING / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}`,
      message: `${SALES_REPORT_ROWS.filter((r) => r.balanceAmount > 0).length} customers owe money. See the Balances report.`,
    });
  }
  // Today's no-shows
  const noShowsToday = APPOINTMENTS.filter(
    (a) => dayjs(a.startsAt).format('YYYY-MM-DD') === TODAY && a.status === 'No-Show',
  ).length;
  if (noShowsToday > 0) {
    alerts.push({
      key: 'no-shows',
      severity: 'warning',
      title: `${noShowsToday} no-show${noShowsToday === 1 ? '' : 's'} today`,
      message: 'Follow up with the front desk to reschedule and recover the slot.',
    });
  }
  return alerts;
})();
