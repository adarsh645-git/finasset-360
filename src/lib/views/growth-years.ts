import { netWorthOn, type FxRate, type HistoryItem } from "@/lib/calc";
import { DASH, compact, signedPct } from "@/lib/format";

export type YearRow = {
  /** "2026*" for the current year, which is read at today. */
  year: string;
  /** Compact Net Worth, "$74K". */
  netWorth: string;
  /** Compact debt, "$10K". */
  debt: string;
  /** Whole-percent change from the previous row, or "—". */
  change: string;
};

export type YearsInput = {
  held: HistoryItem[];
  owed: HistoryItem[];
  rates: readonly FxRate[];
  today: string;
  /** Date of the Portfolio's earliest Valuation. */
  earliest: string;
};

/** The "Year by year" card: one row per calendar year from the earliest Valuation's year to
 * the current one, newest first, nominal, at 31 December (today for the current year). */
export function buildYears({ held, owed, rates, today, earliest }: YearsInput): YearRow[] {
  const thisYear = Number.parseInt(today.slice(0, 4));
  const first = Math.min(Number.parseInt(earliest.slice(0, 4)), thisYear);
  const at = (date: string) => ({
    net: netWorthOn({ holdings: held, liabilities: owed }, rates, date, today),
    debt: netWorthOn({ holdings: [], liabilities: owed }, rates, date, today) * -1,
  });
  const rows: YearRow[] = [];
  let previous: number | null = null;
  for (let year = first; year <= thisYear; year++) {
    const current = year === thisYear;
    const { net, debt } = at(current ? today : `${year}-12-31`);
    rows.push({
      year: current ? `${year}*` : String(year),
      netWorth: compact(net),
      debt: compact(debt),
      change: previous === null || previous === 0 ? DASH : signedPct((net - previous) / Math.abs(previous), 0),
    });
    previous = net;
  }
  return rows.reverse();
}
