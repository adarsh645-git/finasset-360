// ISO date (yyyy-mm-dd) helpers, UTC, no time of day.

export const MS_PER_DAY = 86_400_000;

/** [year, month, day] of an ISO date; a "yyyy-mm" month yields no day. */
export function parseIso(iso: string): number[] {
  return iso.split("-").map(Number);
}

/** Whole days since the Unix epoch. */
export function toDay(iso: string): number {
  return Math.round(Date.parse(`${iso}T00:00:00Z`) / MS_PER_DAY);
}

/** Whole calendar months from `today`'s month to `date`'s month (D10);
 * negative for the past. Accepts "yyyy-mm" or a full date. */
export function monthsFromToday(date: string, today: string): number {
  const [year, month] = parseIso(date);
  const [todayYear, todayMonth] = parseIso(today);
  return (year - todayYear) * 12 + (month - todayMonth);
}
