export interface DatedValue {
  date: string;
  value: number;
}

/** A Country's USD series with the inflation it deflates at. */
export interface CountrySeries {
  inflation: number;
  series: DatedValue[];
}

/** Whole calendar months from today's month to `date`'s month (D10);
 * negative for the past. */
function monthsFromToday(date: string, today: string): number {
  const [year, month] = date.split("-").map(Number);
  const [todayYear, todayMonth] = today.split("-").map(Number);
  return (year - todayYear) * 12 + (month - todayMonth);
}

/** `value` on `date` restated in Today's dollars: the past rises, the
 * future falls, and today's month is unchanged. */
export function todaysDollars(
  value: number,
  date: string,
  today: string,
  inflation: number,
): number {
  return value / (1 + inflation) ** (monthsFromToday(date, today) / 12);
}

/** Deflates each Country's series at its own inflation, then sums the
 * results by date. Output is sorted by date. */
export function todaysDollarsTotal(
  countries: CountrySeries[],
  today: string,
): DatedValue[] {
  const totals = new Map<string, number>();
  for (const { inflation, series } of countries) {
    for (const { date, value } of series) {
      totals.set(
        date,
        (totals.get(date) ?? 0) + todaysDollars(value, date, today, inflation),
      );
    }
  }
  return [...totals]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));
}
