// A Valuation older than this many days is stale (user stories 29-31):
// dimmed wherever it's shown, and listed on the dashboard so the User knows
// what to update without hunting.
const STALE_AFTER_DAYS = 30;

/** Whole days between a `YYYY-MM-DD` Valuation date and `asOf`, ignoring
 * time-of-day on both ends — a Valuation recorded this morning is "0 days
 * ago" all day, not a fraction of one. */
export function daysSince(recordedAt: string, asOf: Date = new Date()): number {
  const recorded = Date.parse(`${recordedAt}T00:00:00Z`);
  const asOfMidnightUtc = Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate());
  return Math.round((asOfMidnightUtc - recorded) / 86_400_000);
}

export function isStale(recordedAt: string, asOf: Date = new Date()): boolean {
  return daysSince(recordedAt, asOf) > STALE_AFTER_DAYS;
}

/** "today" / "1 day ago" / "N days ago" — the one place this phrasing is
 * written, so every place a Valuation's age is shown (the tree, the
 * detail-panel history table, the dashboard staleness list, the as-of
 * label) agrees on it, singular included. */
export function daysAgoLabel(recordedAt: string, asOf: Date = new Date()): string {
  const days = daysSince(recordedAt, asOf);
  if (days === 0) return "today";
  return days === 1 ? "1 day ago" : `${days} days ago`;
}
