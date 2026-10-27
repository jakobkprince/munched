/**
 * Formats a date for display, e.g. "Mar 5, 2026".
 * Date-only strings ("2026-03-05", used for log dates) are treated as local dates —
 * `new Date("2026-03-05")` would parse as UTC midnight and show the previous day in US time zones.
 */
export function formatDate(value: string): string {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
