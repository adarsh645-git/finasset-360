import { toDay } from "./dates";
import type { Position } from "./types";

const STALE_AFTER_DAYS = 30;

export interface Staleness {
  /** Whole UTC calendar days since the user-entered figure; null when there is none. */
  ageDays: number | null;
  stale: boolean;
}

/** The caller passes the user-entered date: the latest Valuation for a
 * manually valued Holding or a Liability, or `oldestHandPriceDate` for a
 * Stocks Holding. Null means nothing user-entered, which is never Stale. */
export function checkStaleness(userEnteredDate: string | null, today: string): Staleness {
  if (userEnteredDate === null) return { ageDays: null, stale: false };
  const ageDays = toDay(today) - toDay(userEnteredDate);
  return { ageDays, stale: ageDays > STALE_AFTER_DAYS };
}

/** The oldest Hand Price date among a Stocks Holding's Positions, or null
 * when none is Hand-Priced. ISO dates sort as strings. */
export function oldestHandPriceDate(positions: Position[]): string | null {
  const dates = positions.flatMap((p) => (p.handPriceDate === null ? [] : [p.handPriceDate]));
  return dates.length === 0 ? null : dates.reduce((a, b) => (a <= b ? a : b));
}
