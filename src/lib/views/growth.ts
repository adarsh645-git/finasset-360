import {
  ASSET_CLASSES,
  netWorthOn,
  resolveAssumptions,
  restateInTodaysDollars,
  sampleDates,
  type Country,
  type HistoryItem,
} from "@/lib/calc";
import { stackSeries, type ChartSeries, type Point } from "@/lib/chart";
import { monthLong, signed, usd } from "@/lib/format";
import type { PortfolioData } from "@/lib/read-model/types";
import { fxRatesOf, usableItems } from "@/lib/views/fx";
import { buildWaterfall, type Waterfall } from "@/lib/views/growth-waterfall";
import { ADDING, addAssetHref } from "@/lib/views/links";
import { RANGES, parseRange, type Range } from "@/lib/views/overview";
import { addMonths, calcAssumptions, projectFromToday } from "@/lib/views/projection";
import { calcClassId, calcCountry, historyItem } from "@/lib/views/shell";
import { CLASS_TOKENS } from "@/lib/tokens";
import type { AssetClassId, HoldingData } from "@/lib/read-model/types";

export { RANGES };

export const SCOPES = ["all", "us", "in"] as const;
export type Scope = (typeof SCOPES)[number];
export const MODES = ["simple", "class", "country"] as const;
export type Mode = (typeof MODES)[number];
export const BASES = ["nominal", "today"] as const;
export type Basis = (typeof BASES)[number];

export type Tab = "us" | "in";
/** `tab` is the assumptions card's Country tab; absent until chosen. */
export type GrowthViewState = { range: Range; scope: Scope; mode: Mode; basis: Basis; tab?: Tab };

type Param = string | string[] | null | undefined;
const first = (p: Param) => (Array.isArray(p) ? p[0] : p);
const pick = <T extends string>(list: readonly T[], p: Param, fallback: T): T =>
  list.find((x) => x === first(p)) ?? fallback;

/** The page's view state from its search params; a missing or unknown value is the default. */
export function parseGrowthView(params: Record<string, Param>): GrowthViewState {
  const tab = (["us", "in"] as const).find((t) => t === first(params.tab));
  return {
    range: parseRange(params.range),
    scope: pick(SCOPES, params.scope, "all"),
    mode: pick(MODES, params.mode, "simple"),
    basis: pick(BASES, params.basis, "nominal"),
    ...(tab ? { tab } : {}),
  };
}

const DEFAULTS: Omit<GrowthViewState, "tab"> = { range: "All", scope: "all", mode: "simple", basis: "nominal" };

/** A Growth address that changes some view state and keeps the rest. */
export function growthHref(view: GrowthViewState, change: Partial<GrowthViewState>): string {
  const next = { ...view, ...change };
  const params = new URLSearchParams();
  for (const key of Object.keys(DEFAULTS) as (keyof typeof DEFAULTS)[]) {
    if (next[key] !== DEFAULTS[key]) params.set(key.toLowerCase(), next[key]);
  }
  if (next.tab) params.set("tab", next.tab);
  const query = params.toString();
  return query ? `/growth?${query}` : "/growth";
}

const SCOPE_COUNTRIES: Record<Scope, readonly Country[]> = {
  all: ["US", "India"],
  us: ["US"],
  in: ["India"],
};
const SCOPE_LABEL: Record<Scope, string> = { all: "all countries", us: "United States", in: "India" };
const MODE_LABEL: Record<Mode, string> = {
  simple: "Simple",
  class: "By asset class",
  country: "By country",
};
const BASIS_LABEL: Record<Basis, string> = { nominal: "Nominal", today: "Today's dollars" };
const SCOPE_BUTTON: Record<Scope, string> = { all: "All", us: "United States", in: "India" };

export type GrowthHeader = {
  /** "+$41,000". */
  change: string;
  tone: "up" | "down" | null;
  /** "Net worth change since Oct 2025 · all countries · $110,000 → $151,000". */
  line: string;
};

export type GrowthChart = {
  /** "What you own, what you owe" or "In today's dollars", plus " · ⟨Country⟩" for one Country. */
  title: string;
  subtitle: string;
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
  modes: { value: Mode; label: string; href: string; selected: boolean }[];
  bases: { value: Basis; label: string; href: string; selected: boolean }[];
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
    // Choosing a Country also selects its assumptions tab; All leaves the tab as it is.
    href: growthHref(view, value === "all" ? { scope: value } : { scope: value, tab: value }),
    selected: value === view.scope,
  }));
  const modes = MODES.map((value) => ({
    value,
    label: MODE_LABEL[value],
    href: growthHref(view, { mode: value }),
    selected: value === view.mode,
  }));
  const bases = BASES.map((value) => ({
    value,
    label: BASIS_LABEL[value],
    href: growthHref(view, { basis: value }),
    selected: value === view.basis,
  }));
  if (empty) {
    return {
      view,
      empty,
      addHref: adding ? addAssetHref("/growth") : null,
      ranges,
      scopes,
      modes,
      bases,
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

  const chart = buildChart({ data, view, countries, dates, held, owed, inScope });

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

  return { view, empty, addHref: null, ranges, scopes, modes, bases, header, chart, waterfall };
}

const COUNTRY_VIEW: Record<Country, { name: string; short: string; color: string }> = {
  US: { name: "US net worth", short: "US", color: "var(--country-us)" },
  India: { name: "India net worth", short: "India", color: "var(--country-in)" },
};

const CLASS_COLOR = (id: AssetClassId) => `var(${CLASS_TOKENS[id].cssVar})`;
const CLASS_VIEW = (["realestate", "stocks", "cash", "crypto", "metals", "other"] as const).map((id) => ({
  id,
  slug: calcClassId(id),
  name: ASSET_CLASSES.find((c) => c.id === calcClassId(id))!.name,
  color: CLASS_COLOR(id),
}));

type ChartContext = {
  data: PortfolioData;
  view: GrowthViewState;
  countries: readonly Country[];
  /** History sample dates, the last being today. */
  dates: string[];
  held: HistoryItem[];
  owed: HistoryItem[];
  inScope: <T extends { country: "US" | "IN" }>(items: T[]) => T[];
};

/** The chart card's title, subtitle and series for the view's mode and basis. */
function buildChart({ data, view, countries, dates, held, owed, inScope }: ChartContext): GrowthChart {
  const { today } = data;
  const rates = fxRatesOf(data);
  const worth = (h: HistoryItem[], l: HistoryItem[], date: string) =>
    netWorthOn({ holdings: h, liabilities: l }, rates, date, today);

  // History, then the Projection month by month over the horizon (today is already in history).
  const projection = projectFromToday(data);
  const months = projection.netWorth.length;
  const projected = Array.from({ length: months }, (_, k) => addMonths(today, k + 1));
  const all = [...dates, ...projected];
  const todayMonth = today.slice(0, 7);

  type ByCountry = Partial<Record<Country, number[]>>;
  /** One series per Country in scope: history by `past`, then the Projection's `future`. */
  const perCountry = (
    past: (c: Country, date: string) => number,
    future: (c: Country) => number[],
  ): ByCountry =>
    Object.fromEntries(
      countries.map((c) => [c, [...dates.map((d) => past(c, d)), ...future(c)]]),
    );
  /** Sums the Countries, restating each in Today's dollars first when the basis asks. */
  const total = (series: ByCountry, of: readonly Country[] = countries): number[] =>
    all.map((date, i) => {
      if (view.basis === "nominal") return of.reduce((sum, c) => sum + series[c]![i]!, 0);
      const month = date.slice(0, 7);
      const byCountry = Object.fromEntries(
        of.map((c) => [c, [{ month, netWorth: series[c]![i]! }]]),
      );
      return restateInTodaysDollars(byCountry, todayMonth, calcAssumptions(data))[0]!.netWorth;
    });

  const heldIn = (c: Country) => held.filter((i) => i.country === c);
  const owedIn = (c: Country) => owed.filter((i) => i.country === c);
  const netSeries = perCountry(
    (c, d) => worth(heldIn(c), owedIn(c), d),
    (c) => projection.countries[c].netWorth,
  );
  const net = total(netSeries);
  const owedLine = total(
    perCountry(
      (c, d) => -worth([], owedIn(c), d),
      (c) => projection.countries[c].liabilities,
    ),
  );

  const NET_WORTH = {
    name: "Net worth",
    color: "var(--ink)",
    points: pts(all, net),
    width: 2,
    dot: true,
    bold: true,
    endLabel: true,
  } satisfies ChartSeries;
  const OWED = { name: "Owed", color: "var(--neg)" };

  let series: ChartSeries[];
  if (view.mode === "simple") {
    const assets = total(
      perCountry(
        (c, d) => worth(heldIn(c), [], d),
        (c) => projection.countries[c].assets,
      ),
    );
    series = [
      NET_WORTH,
      {
        name: "Assets",
        color: "var(--pos)",
        points: pts(all, assets),
        area: true,
        areaOpacity: 0.08,
        endLabel: true,
      },
      { ...OWED, points: pts(all, owedLine), area: true, areaOpacity: 0.08, endLabel: true },
    ];
  } else if (view.mode === "class") {
    const holdings = inScope(data.holdings);
    const layers = CLASS_VIEW.map((cls) => {
      const mine = (c: Country) =>
        holdings
          .filter((h: HoldingData) => calcClassId(h.assetClass) === cls.slug && calcCountry(h.country) === c)
          .map(historyItem);
      const values = total(
        perCountry(
          (c, d) => worth(mine(c), [], d),
          (c) => projection.classes[c][cls.slug as keyof typeof projection.classes.US],
        ),
      );
      return { cls, values, now: values[dates.length - 1]! };
    })
      // A class gets a layer when it has value anywhere in the chart, not only today.
      .filter(({ values }) => values.some((v) => Math.abs(v) > 1e-9))
      .sort((a, b) => b.now - a.now);
    series = [
      ...stackSeries(
        layers.map(({ cls, values }) => ({
          name: cls.name,
          color: cls.color,
          points: pts(all, values),
          areaOpacity: 0.35,
          width: 1,
        })),
      ),
      { ...OWED, points: pts(all, owedLine), endLabel: true },
      NET_WORTH,
    ];
  } else {
    series = [
      ...(countries.length > 1
        ? [{ ...NET_WORTH, name: "Total net worth", endName: "Total" }]
        : []),
      ...countries.map((c) => ({
        name: COUNTRY_VIEW[c].name,
        color: COUNTRY_VIEW[c].color,
        points: pts(all, total(netSeries, [c])),
        endName: COUNTRY_VIEW[c].short,
        endLabel: true,
        width: 1.75,
      })),
    ];
  }

  const scoped = view.scope === "all" ? "" : ` · ${SCOPE_LABEL[view.scope]}`;
  const inflation = resolveAssumptions(calcAssumptions(data)).countries;
  const subtitle =
    view.basis === "nominal"
      ? "Nominal dollars, not adjusted for inflation"
      : `Each country restated in ${monthLong(today)} dollars at its own inflation: ${countries
          .map((c) => `${COUNTRY_VIEW[c].short} ${(inflation[c].inflation * 100).toFixed(1)}%`)
          .join(", ")}`;

  return {
    title: (view.basis === "nominal" ? "What you own, what you owe" : "In today's dollars") + scoped,
    subtitle,
    today,
    height: CHART_HEIGHT,
    zero: true,
    legend: series.map((s) => ({ name: s.name!, color: s.color })),
    series,
  };
}
