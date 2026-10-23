import {
  netWorthOn,
  project,
  sampleDates,
  yearBefore,
  type AssetClassId as CalcClassId,
  type FxRate,
  type ProjectionAssumptionsInput,
} from "@/lib/calc";
import type { ChartGoal, ChartSeries, Point } from "@/lib/chart";
import { DASH, monthLong, signed, signedPct, usd } from "@/lib/format";
import type { PortfolioData } from "@/lib/read-model/types";
import { calcClassId, calcCountry, historyItem } from "@/lib/views/shell";

export const RANGES = ["1Y", "3Y", "5Y", "All"] as const;
export type Range = (typeof RANGES)[number];

/** The `?range=` value, with All for a missing or unknown one. */
export function parseRange(param: string | string[] | null | undefined): Range {
  const value = Array.isArray(param) ? param[0] : param;
  return RANGES.find((r) => r === value) ?? "All";
}

export type OverviewHeader = {
  label: string;
  total: string;
  /** "+$180,000 (+18.0%)"; null on first run, "—" with no history. */
  change: string | null;
  /** "since Oct 2025". */
  since: string | null;
  tone: "up" | "down" | null;
};

export type OverviewChart = {
  series: ChartSeries[];
  today: string;
  height: number;
  goals: ChartGoal[];
};

export type Overview = {
  firstRun: boolean;
  header: OverviewHeader;
  range: Range;
  ranges: { label: Range; href: string; selected: boolean }[];
  chart: OverviewChart | null;
};

const LABEL = "Net worth · rolled up to USD";
const CHART_HEIGHT = 270;

function yearsBefore(date: string, years: number): string {
  let d = date;
  for (let i = 0; i < years; i++) d = yearBefore(d);
  return d;
}

/** The date `months` calendar months after `date`, clamped to the month's last day. */
function addMonths(date: string, months: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const total = y * 12 + (m - 1) + months;
  const ty = Math.floor(total / 12);
  const tm = total % 12;
  const last = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
  return new Date(Date.UTC(ty, tm, Math.min(d, last))).toISOString().slice(0, 10);
}

const pts = (dates: string[], values: number[]): Point[] =>
  dates.map((date, i) => ({ date, value: values[i]! }));

export function buildOverview(data: PortfolioData, { range }: { range: Range }): Overview {
  const { today } = data;
  const ranges = RANGES.map((label) => ({
    label,
    href: `/?range=${label}`,
    selected: label === range,
  }));

  const isCurrent = (i: { archivedAt: string | null }) => i.archivedAt === null;
  const firstRun = !data.holdings.some(isCurrent) && !data.liabilities.some(isCurrent);
  if (firstRun) {
    return {
      firstRun,
      header: { label: LABEL, total: usd(0), change: null, since: null, tone: null },
      range,
      ranges,
      chart: null,
    };
  }

  const rates: FxRate[] = data.fx.history.length
    ? data.fx.history
    : data.fx.today
      ? [{ date: data.fx.today.asOf, rate: data.fx.today.rate }]
      : [];
  // Without any FX Rate an INR item can't be valued in USD; it is left out rather than guessed.
  const usable = <T extends { country: "US" | "IN" }>(items: T[]): T[] =>
    rates.length ? items : items.filter((i) => i.country === "US");
  const holdings = usable(data.holdings);
  const liabilities = usable(data.liabilities);
  const held = holdings.map(historyItem);
  const owed = liabilities.map(historyItem);
  const worth = (h: typeof held, l: typeof owed, date: string) =>
    netWorthOn({ holdings: h, liabilities: l }, rates, date, today);

  const earliest = [...holdings, ...liabilities]
    .flatMap((i) => i.valuations.map((v) => v.date))
    .sort()[0];
  const netNow = worth(held, owed, today);

  let change: string | null = DASH;
  let since: string | null = null;
  let tone: OverviewHeader["tone"] = null;
  let dates = [today];
  if (earliest !== undefined) {
    const rangeStart = range === "All" ? earliest : yearsBefore(today, Number.parseInt(range));
    const start = rangeStart > earliest ? rangeStart : earliest;
    dates = sampleDates(earliest, rangeStart, today);
    const then = worth(held, owed, start);
    const diff = netNow - then;
    change = then > 0 ? `${signed(diff)} (${signedPct(diff / then)})` : signed(diff);
    since = `since ${monthLong(start)}`;
    tone = diff === 0 ? null : diff > 0 ? "up" : "down";
  }

  const assetsAt = (date: string) => worth(held, [], date);
  const owedAt = (date: string) => -worth([], owed, date);

  // History, then the Projection month by month over the horizon (today is already in history).
  const projection = projectFromToday(data);
  const projected = projection.netWorth.map((_, k) => addMonths(today, k + 1));
  const all = [...dates, ...projected];
  const net = [...dates.map((d) => worth(held, owed, d)), ...projection.netWorth];
  const assets = [...dates.map(assetsAt), ...projection.assets];
  const debts = [...dates.map(owedAt), ...projection.liabilities];

  return {
    firstRun,
    header: { label: LABEL, total: usd(netNow), change, since, tone },
    range,
    ranges,
    chart: {
      today,
      height: CHART_HEIGHT,
      goals: [],
      series: [
        {
          name: "Net worth",
          color: "var(--ink)",
          points: pts(all, net),
          area: true,
          areaOpacity: 0.06,
          width: 2,
          dot: true,
          bold: true,
        },
        { name: "Assets", color: "var(--pos)", points: pts(all, assets), line: false, scaled: false },
        { name: "Liabilities", color: "var(--neg)", points: pts(all, debts), line: false, scaled: false },
      ],
    },
  };
}

const fraction = (v: number | null) => (v === null ? null : v / 100);

/** The Projection of current items from month 1 on, in USD. */
function projectFromToday(data: PortfolioData) {
  const a = data.assumptions;
  const country = (c: "US" | "IN") => {
    const x = a.byCountry[c];
    return {
      inflation: fraction(x.inflation),
      realEstate: fraction(x.realestate),
      stocks: fraction(x.stocks),
      cash: fraction(x.cash),
      monthlySavings: x.monthlySavings,
    };
  };
  const assumptions: ProjectionAssumptionsInput = {
    countries: { US: country("US"), India: country("IN") },
    shared: {
      crypto: fraction(a.shared.crypto),
      metals: fraction(a.shared.metals),
      vehiclesAndOther: fraction(a.shared.other),
    },
    savingsGrowth: fraction(a.savingsGrowth),
    horizonYears: a.horizonYears,
  };
  const fxRate = data.fx.today?.rate ?? data.fx.history.at(-1)?.rate ?? 1;
  const hasRate = data.fx.today !== null || data.fx.history.length > 0;
  const usable = <T extends { country: "US" | "IN" }>(items: T[]) =>
    items.filter((i) => hasRate || i.country === "US");
  const result = project({
    holdings: usable(data.holdings.filter((h) => h.archivedAt === null)).map((h) => ({
      id: h.id,
      country: calcCountry(h.country),
      assetClass: calcClassId(h.assetClass) as CalcClassId,
      currentValue: h.currentValue,
    })),
    liabilities: usable(data.liabilities.filter((l) => l.archivedAt === null)).map((l) => ({
      id: l.id,
      country: calcCountry(l.country),
      balance: l.currentBalance,
      apr: l.apr / 100,
      monthlyPayment: l.monthlyPayment,
    })),
    assumptions,
    fxRate,
  });
  return {
    netWorth: result.netWorthUsd.slice(1),
    assets: result.totalAssetsUsd.slice(1),
    liabilities: result.totalLiabilitiesUsd.slice(1),
  };
}
