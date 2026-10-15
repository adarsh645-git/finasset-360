import { lookupFxRate, toUsd, type FxRate } from "./fx";
import type { Country } from "./types";

/** A Holding's value or a Liability's balance on a date, in native currency. */
export interface Valuation {
  date: string;
  value: number;
}

/** A Holding or Liability as the history needs it. `currentValue` acts as a
 * Valuation dated today (D7); `archivedOn` is the last day it counts. */
export interface HistoryItem {
  kind: "holding" | "liability";
  country: Country;
  valuations: Valuation[];
  currentValue: number;
  archivedOn: string | null;
}

export interface TwelveMonthChange {
  /** USD. Growth for Holdings; paid down for Liabilities. */
  amount: number;
  /** Fraction of the year-ago total; null when that total is 0. */
  percent: number | null;
}

const MS_PER_DAY = 86_400_000;

// --- ISO date helpers (UTC, no time of day) ---

function toDay(iso: string): number {
  return Math.round(Date.parse(`${iso}T00:00:00Z`) / MS_PER_DAY);
}

function fromDay(day: number): string {
  return new Date(day * MS_PER_DAY).toISOString().slice(0, 10);
}

function monthEnd(year: number, monthIndex: number): string {
  return fromDay(Date.UTC(year, monthIndex + 1, 0) / MS_PER_DAY);
}

/** The same calendar day 12 months earlier, clamped (Feb 29 -> Feb 28). */
function twelveMonthsBefore(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year - 1, month, 0)).getUTCDate();
  return fromDay(
    Date.UTC(year - 1, month - 1, Math.min(day, lastDay)) / MS_PER_DAY,
  );
}

// --- The value on a date (D7) ---

function valuationsIncludingToday(
  item: HistoryItem,
  today: string,
): Valuation[] {
  const recorded = item.valuations.filter((v) => v.date !== today);
  const withToday =
    item.archivedOn === null
      ? [...recorded, { date: today, value: item.currentValue }]
      : recorded;
  return withToday.sort((a, b) => a.date.localeCompare(b.date));
}

/** Native value on `date`: 0 before the first Valuation, linear by day
 * between Valuations, flat after the last, 0 after the archive date. */
export function valueOn(
  item: HistoryItem,
  date: string,
  today: string,
): number {
  if (item.archivedOn !== null && date > item.archivedOn) return 0;
  const points = valuationsIncludingToday(item, today);
  if (points.length === 0 || date < points[0].date) return 0;
  const last = points[points.length - 1];
  if (date >= last.date) return last.value;
  const nextIndex = points.findIndex((p) => p.date > date);
  const before = points[nextIndex - 1];
  const after = points[nextIndex];
  const span = toDay(after.date) - toDay(before.date);
  const elapsed = toDay(date) - toDay(before.date);
  return before.value + ((after.value - before.value) * elapsed) / span;
}

// --- Sample dates ---

/** Start, every month-end after the start and before today, then today.
 * The start is the later of `rangeStart` and the earliest Valuation. */
export function sampleDates(
  rangeStart: string,
  earliestValuation: string,
  today: string,
): string[] {
  const start = rangeStart > earliestValuation ? rangeStart : earliestValuation;
  if (start >= today) return [today];
  const dates = [start];
  const [startYear, startMonth] = start.split("-").map(Number);
  for (let monthIndex = startMonth - 1, year = startYear; ; monthIndex++) {
    if (monthIndex === 12) {
      monthIndex = 0;
      year++;
    }
    const end = monthEnd(year, monthIndex);
    if (end >= today) break;
    if (end > start) dates.push(end);
  }
  dates.push(today);
  return dates;
}

// --- Past Net Worth (D8) ---

function usdOn(
  item: HistoryItem,
  rates: FxRate[],
  date: string,
  today: string,
): number {
  return toUsd(
    valueOn(item, date, today),
    item.country,
    lookupFxRate(rates, date).rate,
  );
}

/** Net Worth in USD on `date`, each item converted at that date's FX Rate. */
export function netWorthOn(
  items: HistoryItem[],
  rates: FxRate[],
  date: string,
  today: string,
): number {
  return items.reduce(
    (sum, item) =>
      sum +
      (item.kind === "liability" ? -1 : 1) * usdOn(item, rates, date, today),
    0,
  );
}

// --- 12-month change (D9) ---

/** The 12-month change of a set of items (one item is a set of one). Only
 * items with a Valuation on or before the start count. Null when none do.
 * Liabilities count as paid down: balance then minus balance now. */
export function twelveMonthChange(
  items: HistoryItem[],
  rates: FxRate[],
  today: string,
): TwelveMonthChange | null {
  const start = twelveMonthsBefore(today);
  const established = items.filter((item) =>
    item.valuations.some((v) => v.date <= start),
  );
  if (established.length === 0) return null;

  let amount = 0;
  let startTotal = 0;
  for (const item of established) {
    const then = usdOn(item, rates, start, today);
    const now = usdOn(item, rates, today, today);
    amount += item.kind === "liability" ? then - now : now - then;
    startTotal += then;
  }
  return { amount, percent: startTotal === 0 ? null : amount / startTotal };
}
