/**
 * Helpers for DATE columns (due_date, start_date, end_date).
 * Prisma represents a DATE as a JS Date at 00:00 UTC, so all helpers work in UTC.
 */

/** "2026-10-19" -> Date at 2026-10-19T00:00:00.000Z */
export function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

/** Date -> "2026-10-19" */
export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Today's date at 00:00 UTC */
export function todayUtc(): Date {
  return parseDateOnly(new Date().toISOString().slice(0, 10));
}

/** true for a real calendar date in YYYY-MM-DD format (rejects 2026-02-30) */
export function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = parseDateOnly(value);
  return !Number.isNaN(date.getTime()) && formatDateOnly(date) === value;
}
