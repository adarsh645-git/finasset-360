// The detail page's chart and Value log (design D14).
import {
  fxRateOn,
  project,
  sampleDates,
  valueOn,
  type AssetClassId as CalcClassId,
  type FxRate,
} from "@/lib/calc";
import type { ChartSeries, Point } from "@/lib/chart";
import { DASH, formatDay, monthLong, native, signedPct } from "@/lib/format";
import type { HoldingData, PortfolioData } from "@/lib/read-model/types";
import { addMonths, calcAssumptions } from "@/lib/views/projection";
import { calcClassId, calcCountry, historyItem } from "@/lib/views/shell";

export type HoldingChart = {
  title: string;
  sub: string;
  today: string;
  height: number;
  /** A list so redesign-liabilities can replace it (value, loan balance, equity gap). */
  series: ChartSeries[];
};

export type ValueLogRow = { date: string; value: string; change: string };
export type ValueLog = { title: string; rows: ValueLogRow[] };

const MINUS = "−";

/** USD value by date: recorded history to today, then the calc Projection. */
export function buildChart(
  data: PortfolioData,
  holding: HoldingData,
  rates: readonly FxRate[],
  hasRate: boolean,
): HoldingChart {
  const { today } = data;
  const india = holding.country === "IN";
  const item = historyItem(holding);
  const first =
    [...holding.valuations.map((v) => v.date)].sort()[0] ?? holding.createdAt.slice(0, 10);
  const dates = sampleDates(first, first, today);
  const toUsd = (nativeValue: number, date: string) =>
    india ? nativeValue / fxRateOn(rates, date).rate : nativeValue;

  const points: Point[] = hasRate
    ? dates.map((date) => ({ date, value: toUsd(valueOn(item, date, today), date) }))
    : [];

  if (hasRate) {
    const rate = india ? fxRateOn(rates, today).rate : 1;
    const { holdings } = project({
      holdings: [
        {
          id: holding.id,
          country: calcCountry(holding.country),
          assetClass: calcClassId(holding.assetClass) as CalcClassId,
          currentValue: holding.currentValue,
        },
      ],
      liabilities: [],
      assumptions: calcAssumptions(data),
      fxRate: rate,
    });
    holdings[0]!.usd.slice(1).forEach((value, k) => points.push({ date: addMonths(today, k + 1), value }));
  }

  return {
    title: "Value over time",
    sub: india ? "Shown in USD; includes rupee movement" : "Interpolated between logged values",
    today,
    height: 240,
    series: [
      {
        name: "Value",
        color: "var(--ink)",
        points,
        area: true,
        areaOpacity: 0.06,
        width: 2,
        dot: true,
        bold: true,
      },
    ],
  };
}

type Entry = { date: string; label: string; value: number };

/** Newest first, with the change from the previous (older) row. */
export function buildValueLog(holding: HoldingData, today: string): ValueLog {
  const country = calcCountry(holding.country);
  const valuations = [...holding.valuations].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  let entries: Entry[];
  if (holding.assetClass === "stocks") {
    // The last Valuation of each earlier month, then today's current value.
    const month = today.slice(0, 7);
    const lastOfMonth = new Map<string, number>();
    for (const v of valuations) {
      if (v.date.slice(0, 7) < month) lastOfMonth.set(v.date.slice(0, 7), v.value);
    }
    entries = [...lastOfMonth].map(([m, value]) => ({ date: m, label: monthLong(`${m}-01`), value }));
    entries.push({ date: today, label: formatDay(today), value: holding.currentValue });
  } else {
    entries = valuations.map((v) => ({ date: v.date, label: formatDay(v.date), value: v.value }));
    if (entries.length === 0) {
      entries = [{ date: today, label: formatDay(today), value: holding.currentValue }];
    }
  }

  const rows = entries.map((e, i): ValueLogRow => {
    const prev = entries[i - 1];
    let change = DASH;
    if (prev) {
      const diff = e.value - prev.value;
      const amount = (diff >= 0 ? "+" : MINUS) + native(Math.abs(diff), country);
      change = prev.value === 0 ? amount : `${amount} · ${signedPct(diff / prev.value)}`;
    }
    return { date: i === 0 ? `${e.label} · added` : e.label, value: native(e.value, country), change };
  });
  return { title: "Logged whenever you update", rows: rows.reverse() };
}
