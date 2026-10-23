import type { Staleness, StalenessInput } from "./types";

export const STALE_AFTER_DAYS = 30;
const MS_PER_DAY = 86_400_000;

const utcDay = (date: string): number => Date.parse(`${date}T00:00:00Z`);

function userEnteredDate(item: StalenessInput): string | undefined {
  const dates =
    item.kind === "manual"
      ? item.valuations.filter((v) => v.source === "user").map((v) => v.date)
      : item.positions.flatMap((p) => (p.handPriceDate ? [p.handPriceDate] : []));
  if (dates.length === 0) return undefined;
  // YYYY-MM-DD sorts lexically. Manual items use the latest date, Stocks the oldest.
  const sorted = [...dates].sort();
  return item.kind === "manual" ? sorted[sorted.length - 1] : sorted[0];
}

/** Age of an item's user-entered figure and whether it is Stale (over 30 days).
 * `today` is injected; only its UTC calendar day matters. */
export function staleness(item: StalenessInput, today: Date): Staleness {
  const entered = userEnteredDate(item);
  if (entered === undefined) return { ageDays: null, stale: false };
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const ageDays = Math.round((todayUtc - utcDay(entered)) / MS_PER_DAY);
  return { ageDays, stale: ageDays > STALE_AFTER_DAYS };
}
