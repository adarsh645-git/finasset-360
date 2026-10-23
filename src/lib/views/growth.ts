import { netWorthOn, sampleDates, type Country } from "@/lib/calc";
import type { ChartSeries, Point } from "@/lib/chart";
import { monthLong, signed, usd } from "@/lib/format";
import type { PortfolioData } from "@/lib/read-model/types";
import { fxRatesOf, usableItems } from "@/lib/views/fx";
import { buildWaterfall, type Waterfall } from "@/lib/views/growth-waterfall";
import { ADDING, addAssetHref } from "@/lib/views/links";
import { RANGES, parseRange, type Range } from "@/lib/views/overview";
import { addMonths, projectFromToday } from "@/lib/views/projection";
import { calcCountry, historyItem } from "@/lib/views/shell";

export { RANGES };

export const SCOPES = ["all", "us", "in"] as const;
export type Scope = (typeof SCOPES)[number];
export const MODES = ["simple", "class", "country"] as const;
export type Mode = (typeof MODES)[number];
export const BASES = ["nominal", "today"] as const;
export type Basis = (typeof BASES)[number];

export type GrowthViewState = { range: Range; scope: Scope; mode: Mode; basis: Basis };

type Param = string | string[] | null | undefined;
const first = (p: Param) => (Array.isArray(p) ? p[0] : p);
const pick = <T extends string>(list: readonly T[], p: Param, fallback: T): T =>
  list.find((x) => x === first(p)) ?? fallback;

/** The page's view state from its search params; a missing or unknown value is the default. */
export function parseGrowthView(params: Record<string, Param>): GrowthViewState {
  return {
    range: parseRange(params.range),
    scope: pick(SCOPES, params.scope, "all"),
    mode: pick(MODES, params.mode, "simple"),
    basis: pick(BASES, params.basis, "nominal"),
  };
}

const DEFAULTS: GrowthViewState = { range: "All", scope: "all", mode: "simple", basis: "nominal" };

/** A Growth address that changes some view state and keeps the rest. */
export function growthHref(view: GrowthViewState, change: Partial<GrowthViewState>): string {
  const next = { ...view, ...change };
  const params = new URLSearchParams();
  for (const key of Object.keys(DEFAULTS) as (keyof GrowthViewState)[]) {
    if (next[key] !== DEFAULTS[key]) params.set(key.toLowerCase(), next[key]);
  }
  const query = params.toString();
  return query ? `/growth?${query}` : "/growth";
}

const SCOPE_COUNTRIES: Record<Scope, readonly Country[]> = {
  all: ["US", "India"],
  us: ["US"],
  in: ["India"],
};
const SCOPE_LABEL: Record<Scope, string> = { all: "all countries", us: "United States", in: "India" };
const SCOPE_BUTTON: Record<Scope, string> = { all: "All", us: "United States", in: "India" };

export type GrowthHeader = {
  /** "+$41,000". */
  change: string;
  tone: "up" | "down" | null;
  /** "Net worth change since Oct 2025 · all countries · $110,000 → $151,000". */
  line: string;
};

export type GrowthChart = {
  series: ChartSeries[];
  today: string;
  height: number;
  zero: true;
  legend: { name: string; color: string }[];
};

export type Growth = {
  view: GrowthViewState;
  empty: boolean;
  /** The empty card's link to the add-asset modal; null while adding is off. */
  addHref: string | null;
  ranges: { label: Range; href: string; selected: boolean }[];
  scopes: { value: Scope; label: string; href: string; selected: boolean }[];
  header: GrowthHeader | null;
  chart: GrowthChart | null;
  /** "Where the change came from"; null on the empty page. */
  waterfall: Waterfall | null;
};

const CHART_HEIGHT = 300;

function yearsBefore(date: string, years: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const last = new Date(Date.UTC(y - years, m, 0)).getUTCDate();
  return new Date(Date.UTC(y - years, m - 1, Math.min(d, last))).toISOString().slice(0, 10);
}

const pts = (dates: string[], values: number[]): Point[] =>
  dates.map((date, i) => ({ date, value: values[i]! }));

export function buildGrowth(
  data: PortfolioData,
  view: GrowthViewState,
  { adding = ADDING }: { adding?: boolean } = {},
): Growth {
  const { today } = data;
  const empty =
    !data.holdings.some((h) => h.archivedAt === null) &&
    !data.liabilities.some((l) => l.archivedAt === null);
  const ranges = RANGES.map((label) => ({
    label,
    href: growthHref(view, { range: label }),
    selected: label === view.range,
  }));
  const scopes = SCOPES.map((value) => ({
    value,
    label: SCOPE_BUTTON[value],
    href: growthHref(view, { scope: value }),
    selected: value === view.scope,
  }));
  if (empty) {
    return {
      view,
      empty,
      addHref: adding ? addAssetHref("/growth") : null,
      ranges,
      scopes,
      header: null,
      chart: null,
      waterfall: null,
    };
  }

  const rates = fxRatesOf(data);
  const countries = SCOPE_COUNTRIES[view.scope];
  const inScope = <T extends { country: "US" | "IN" }>(items: T[]) =>
    usableItems(items, rates).filter((i) => countries.includes(calcCountry(i.country)));
  const held = inScope(data.holdings).map(historyItem);
  const owed = inScope(data.liabilities).map(historyItem);
  const worth = (h: typeof held, l: typeof owed, date: string) =>
    netWorthOn({ holdings: h, liabilities: l }, rates, date, today);

  // The range start is clamped to the earliest Valuation of the whole Portfolio.
  const earliest = [...usableItems(data.holdings, rates), ...usableItems(data.liabilities, rates)]
    .flatMap((i) => i.valuations.map((v) => v.date))
    .sort()[0];
  const rangeStart = view.range === "All" || earliest === undefined
    ? (earliest ?? today)
    : yearsBefore(today, Number.parseInt(view.range));
  const start = earliest !== undefined && rangeStart < earliest ? earliest : rangeStart;
  const dates = earliest === undefined ? [today] : sampleDates(earliest, rangeStart, today);

  const netThen = worth(held, owed, start);
  const netNow = worth(held, owed, today);
  const diff = netNow - netThen;
  const header: GrowthHeader = {
    change: signed(diff),
    tone: Math.round(diff) === 0 ? null : diff > 0 ? "up" : "down",
    line: `Net worth change since ${monthLong(start)} · ${SCOPE_LABEL[view.scope]} · ${usd(netThen)} → ${usd(netNow)}`,
  };

  const waterfall = buildWaterfall({
    held,
    owed,
    rates,
    start,
    today,
    scope: countries,
    only: view.scope === "all" ? null : SCOPE_LABEL[view.scope],
    netThen,
    netNow,
  });

  // History, then the Projection month by month over the horizon (today is already in history).
  const projection = projectFromToday(data);
  const months = projection.netWorth.length;
  const projected = Array.from({ length: months }, (_, k) => addMonths(today, k + 1));
  const sumOver = (pick: (c: (typeof projection.countries)["US"]) => number[]) =>
    Array.from({ length: months }, (_, k) =>
      countries.reduce((sum, c) => sum + pick(projection.countries[c])[k]!, 0),
    );
  const all = [...dates, ...projected];
  const net = [...dates.map((d) => worth(held, owed, d)), ...sumOver((c) => c.netWorth)];
  const assets = [...dates.map((d) => worth(held, [], d)), ...sumOver((c) => c.assets)];
  const debts = [...dates.map((d) => -worth([], owed, d)), ...sumOver((c) => c.liabilities)];

  const chart: GrowthChart = {
    today,
    height: CHART_HEIGHT,
    zero: true,
    legend: [
      { name: "Net worth", color: "var(--ink)" },
      { name: "Assets", color: "var(--pos)" },
      { name: "Owed", color: "var(--neg)" },
    ],
    series: [
      {
        name: "Net worth",
        color: "var(--ink)",
        points: pts(all, net),
        width: 2,
        dot: true,
        bold: true,
        endLabel: true,
      },
      {
        name: "Assets",
        color: "var(--pos)",
        points: pts(all, assets),
        area: true,
        areaOpacity: 0.08,
        endLabel: true,
      },
      {
        name: "Owed",
        color: "var(--neg)",
        points: pts(all, debts),
        area: true,
        areaOpacity: 0.08,
        endLabel: true,
      },
    ],
  };

  return { view, empty, addHref: null, ranges, scopes, header, chart, waterfall };
}
