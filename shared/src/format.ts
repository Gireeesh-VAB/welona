/**
 * Display formatting helpers shared across the Admin Panel.
 * Money is stored as integer minor units (paise); see prisma/schema.prisma.
 */

/** Format integer minor units as Indian Rupees, e.g. 1500000 -> "₹15,000.00". */
export function formatMoney(minorUnits: number | null | undefined): string {
  const value = (minorUnits ?? 0) / 100;
  return `₹${value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Compact money for KPI cards, e.g. 1500000 -> "₹15,000". */
export function formatMoneyShort(minorUnits: number | null | undefined): string {
  const value = Math.round((minorUnits ?? 0) / 100);
  return `₹${value.toLocaleString('en-IN')}`;
}

/** Format a date as "18 May 2026". Returns an em dash for empty values. */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Convert a snake_case status into a "Title Case" label. */
export function titleCase(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Parse a rupee amount typed by a user into integer minor units. */
export function toMinorUnits(rupees: number | null | undefined): number {
  return Math.round((rupees ?? 0) * 100);
}
