/**
 * Date helpers used across the HR routes.
 *
 * Attendance and leave keys are *calendar days*, but the database stores
 * `DateTime`. To keep `(employeeId, date)` unique per day regardless of the
 * caller's clock, every date is snapped to UTC midnight before being written
 * or compared.
 */

/** Snap a date (or ISO string) to UTC 00:00 of the same Y/M/D. */
export function dayKey(input: Date | string): Date {
  const d = typeof input === 'string' ? new Date(input) : input;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Inclusive number of days between two day-keys, where same-day returns 1. */
export function inclusiveDays(from: Date, to: Date): number {
  const a = dayKey(from).getTime();
  const b = dayKey(to).getTime();
  return Math.floor((b - a) / 86_400_000) + 1;
}

/** Start of the month for a date, in UTC. */
export function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/** First day of the *next* month for a date, in UTC. Use as an exclusive upper bound. */
export function startOfNextMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}

/** Start of today in UTC. */
export function startOfToday(): Date {
  return dayKey(new Date());
}

/** Start of `days` from today (UTC). Positive = future, negative = past. */
export function shiftDay(days: number, from: Date = new Date()): Date {
  const base = dayKey(from);
  return new Date(base.getTime() + days * 86_400_000);
}
