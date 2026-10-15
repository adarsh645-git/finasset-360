import type {
  FxRate,
  FxRateLookup,
  HistoryItem,
  HistoryPortfolio,
  TwelveMonthChange,
} from "./types";

const MS_PER_DAY = 86_400_000;

const dayNumber = (date: string): number => Date.parse(`${date}T00:00:00Z`) / MS_PER_DAY;
const isoDay = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/** The date one calendar year before `date`, clamped to the month's last day. */
function yearBefore(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y - 1, m, 0)).getUTCDate();
  return isoDay(Date.UTC(y - 1, m - 1, Math.min(d, lastDay)));
}

/** Native value of an item on `date`: a straight line by day between Valuations,
 * flat after the last, 0 before the first and after archive. A `currentValue`
 * acts as a Valuation dated `today`. */
export function valueOn(item: HistoryItem, date: string, today: string): number {
  if (item.archivedOn !== undefined && date > item.archivedOn) return 0;
  const points = item.valuations.map((v) => ({ date: v.date, amount: v.amount }));
  if (item.currentValue !== undefined && !points.some((p) => p.date === today)) {
    points.push({ date: today, amount: item.currentValue });
  }
  points.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  if (points.length === 0 || date < points[0].date) return 0;
  const last = points[points.length - 1];
  if (date >= last.date) return last.amount;
  const after = points.findIndex((p) => p.date > date);
  const a = points[after - 1];
  const b = points[after];
  const span = dayNumber(b.date) - dayNumber(a.date);
  return a.amount + ((b.amount - a.amount) * (dayNumber(date) - dayNumber(a.date))) / span;
}

/** Start, every month-end after the start and before today, then today.
 * The start is the later of the range start and the earliest Valuation. */
export function sampleDates(earliestValuation: string, rangeStart: string, today: string): string[] {
  const start = rangeStart > earliestValuation ? rangeStart : earliestValuation;
  if (start >= today) return [today];
  const dates = [start];
  const [ty, tm] = today.split("-").map(Number);
  let [y, m] = start.split("-").map(Number);
  for (;;) {
    const monthEnd = isoDay(Date.UTC(y, m, 0));
    if (monthEnd >= today) break;
    if (monthEnd > start) dates.push(monthEnd);
    if (y === ty && m === tm) break;
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  dates.push(today);
  return dates;
}

/** The latest INR-per-USD rate on or before `date`, else the earliest rate,
 * with the date it was stored. */
export function fxRateOn(rates: readonly FxRate[], date: string): FxRateLookup {
  if (rates.length === 0) throw new Error("fxRateOn needs at least one FX Rate");
  const sorted = [...rates].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  let found = sorted[0];
  for (const r of sorted) if (r.date <= date) found = r;
  return { rate: found.rate, asOf: found.date };
}

function usdValueOn(item: HistoryItem, rates: readonly FxRate[], date: string, today: string): number {
  const native = valueOn(item, date, today);
  return item.country === "US" ? native : native / fxRateOn(rates, date).rate;
}

/** Holdings minus Liabilities on `date`, each converted at that date's FX Rate. */
export function netWorthOn(
  portfolio: HistoryPortfolio,
  rates: readonly FxRate[],
  date: string,
  today: string,
): number {
  const sum = (items: readonly HistoryItem[]) =>
    items.reduce((total, item) => total + usdValueOn(item, rates, date, today), 0);
  return sum(portfolio.holdings) - sum(portfolio.liabilities);
}

type ChangeContext = { fxRates: readonly FxRate[]; today: string };

function presentAtStart(item: HistoryItem, start: string): boolean {
  return item.valuations.some((v) => v.date <= start);
}

function change(then: number, now: number): TwelveMonthChange {
  return { amount: now - then, percent: then === 0 ? undefined : (now - then) / then };
}

/** USD change over 12 months; absent for an item with no Valuation by the start. */
export function twelveMonthChange(item: HistoryItem, ctx: ChangeContext): TwelveMonthChange | undefined {
  const start = yearBefore(ctx.today);
  if (!presentAtStart(item, start)) return undefined;
  return change(
    usdValueOn(item, ctx.fxRates, start, ctx.today),
    usdValueOn(item, ctx.fxRates, ctx.today, ctx.today),
  );
}

/** Like-for-like change of a set: only items present at the start count. For
 * Liabilities the amount is paid down (then minus now). */
export function setTwelveMonthChange(
  items: readonly HistoryItem[],
  ctx: ChangeContext,
  kind: "holdings" | "liabilities",
): TwelveMonthChange | undefined {
  const start = yearBefore(ctx.today);
  const counted = items.filter((item) => presentAtStart(item, start));
  if (counted.length === 0) return undefined;
  const sum = (date: string) =>
    counted.reduce((total, item) => total + usdValueOn(item, ctx.fxRates, date, ctx.today), 0);
  const then = sum(start);
  const now = sum(ctx.today);
  const result = kind === "holdings" ? change(then, now) : change(now, then);
  return { amount: result.amount, percent: then === 0 ? undefined : result.amount / then };
}
