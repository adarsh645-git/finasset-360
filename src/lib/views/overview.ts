import {
  ASSET_CLASSES,
  attributeChange,
  equity,
  fxRateOn,
  percentOwned,
  netWorthOn,
  sampleDates,
  setTwelveMonthChange,
  valueOn,
  yearBefore,
  type FxRate,
  type HistoryItem,
} from "@/lib/calc";
import type { ChartGoal, ChartSeries, Point } from "@/lib/chart";
import {
  compact,
  DASH,
  dayMonth,
  monthLong,
  share,
  signed,
  signedCompact,
  signedPct,
  usd,
} from "@/lib/format";
import type { AssetClassId, PortfolioData } from "@/lib/read-model/types";
import { CLASS_TOKENS, COUNTRY_TOKENS } from "@/lib/tokens";
import { fxRatesOf, usableItems } from "@/lib/views/fx";
import { ADDING, EXISTING_ROUTES, hrefFor, type RouteFamily } from "@/lib/views/links";
import { buildStaleList, type StaleRow } from "@/lib/views/stale-list";
import { calcClassId, historyItem } from "@/lib/views/shell";
import { addMonths, projectFromToday } from "@/lib/views/projection";
import { goalRows, type GoalRow } from "@/lib/views/goals";

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

export type StatCard = {
  label: string;
  value: string;
  detail: string;
  href: string | null;
};

export type AllocationRow = {
  id: string;
  name: string;
  /** CSS variable of the class colour. */
  dot: string;
  count: number;
  value: string;
  share: string;
  /** Share of total assets as a 0–100 bar width. */
  pct: number;
  /** Signed compact 12-month change, "—" when absent. */
  change: string;
  href: string | null;
};

export type EquityRow = {
  id: string;
  name: string;
  equity: string;
  /** % owned as a 0-100 bar width. */
  pct: number;
  /** "45% owned · +$8K in 12 mo". */
  detail: string;
  /** "$74.3K value − $41.1K loan". */
  breakdown: string;
  href: string | null;
};

export type CountryBlock = {
  code: "US" | "IN";
  name: string;
  dot: string;
  net: string;
  detail: string;
  share: string;
  pct: number;
};

export type CurrencyEffect = {
  amount: string;
  tone: "up" | "down" | null;
  note: string;
};

export type Overview = {
  firstRun: boolean;
  /** The first-run card's Add button target; null while adding is off. */
  addHref: string | null;
  header: OverviewHeader;
  range: Range;
  ranges: { label: Range; href: string; selected: boolean }[];
  chart: OverviewChart | null;
  stats: { assets: StatCard; liabilities: StatCard; equity: StatCard } | null;
  allocation: { rows: AllocationRow[] } | null;
  equity: { rows: EquityRow[] } | null;
  countries: CountryBlock[];
  currencyEffect: CurrencyEffect | null;
  needsUpdating: { title: string; rows: StaleRow[] } | null;
  /** The next three unreached Goals; null when there are none. */
  goals: { rows: GoalRow[]; allHref: string | null } | null;
};

const LABEL = "Net worth · rolled up to USD";
const CHART_HEIGHT = 270;

function yearsBefore(date: string, years: number): string {
  let d = date;
  for (let i = 0; i < years; i++) d = yearBefore(d);
  return d;
}

const pts = (dates: string[], values: number[]): Point[] =>
  dates.map((date, i) => ({ date, value: values[i]! }));

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export function buildOverview(
  data: PortfolioData,
  {
    range,
    existing = EXISTING_ROUTES,
    adding = ADDING,
  }: { range: Range; existing?: ReadonlySet<RouteFamily>; adding?: boolean },
): Overview {
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
      addHref: adding ? "/?modal=add-asset" : null,
      header: {
        label: LABEL,
        total: usd(0),
        change: null,
        since: null,
        tone: null,
      },
      range,
      ranges,
      chart: null,
      stats: null,
      allocation: null,
      equity: null,
      countries: [],
      currencyEffect: null,
      needsUpdating: null,
      goals: null,
    };
  }

  const rates = fxRatesOf(data);
  const holdings = usableItems(data.holdings, rates);
  const liabilities = usableItems(data.liabilities, rates);
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
  const goals = goalRows(data, today);
  const projection = projectFromToday(data);
  const projected = projection.netWorth.map((_, k) => addMonths(today, k + 1));
  const all = [...dates, ...projected];
  const net = [...dates.map((d) => worth(held, owed, d)), ...projection.netWorth];
  const assets = [...dates.map(assetsAt), ...projection.assets];
  const debts = [...dates.map(owedAt), ...projection.liabilities];

  return {
    firstRun,
    addHref: null,
    header: { label: LABEL, total: usd(netNow), change, since, tone },
    range,
    ranges,
    ...buildCards(data, { rates, holdings, liabilities, existing }),
    needsUpdating: needsUpdating(data, existing),
    goals: goalsCard(goals, existing),
    chart: {
      today,
      height: CHART_HEIGHT,
      goals: goals.map((g) => ({ value: g.target, label: g.name })),
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
        {
          name: "Assets",
          color: "var(--pos)",
          points: pts(all, assets),
          line: false,
          scaled: false,
        },
        {
          name: "Liabilities",
          color: "var(--neg)",
          points: pts(all, debts),
          line: false,
          scaled: false,
        },
      ],
    },
  };
}

function goalsCard(rows: GoalRow[], existing: ReadonlySet<RouteFamily>): Overview["goals"] {
  const next = rows.filter((r) => r.status.kind !== "reached").slice(0, 3);
  return next.length ? { rows: next, allHref: hrefFor({ kind: "goals" }, existing) } : null;
}

type Cards = Pick<Overview, "stats" | "allocation" | "equity" | "countries" | "currencyEffect">;

function needsUpdating(
  data: PortfolioData,
  existing: ReadonlySet<RouteFamily>,
): Overview["needsUpdating"] {
  const rows = buildStaleList(data, data.today, existing);
  return rows.length ? { title: `Needs updating (${rows.length})`, rows } : null;
}
type Held = PortfolioData["holdings"][number];
type Owed = PortfolioData["liabilities"][number];

function buildCards(
  data: PortfolioData,
  {
    rates,
    holdings: usableHoldings,
    liabilities: usableLiabilities,
    existing,
  }: {
    rates: FxRate[];
    holdings: Held[];
    liabilities: Owed[];
    existing: ReadonlySet<RouteFamily>;
  },
): Cards {
  const { today } = data;
  const holdings = usableHoldings.filter((h) => h.archivedAt === null);
  const liabilities = usableLiabilities.filter((l) => l.archivedAt === null);
  const usdOf = (items: HistoryItem[]) =>
    netWorthOn({ holdings: items, liabilities: [] }, rates, today, today);
  const ctx = { fxRates: rates, today };
  const held = holdings.map(historyItem);
  const owed = liabilities.map(historyItem);
  const assetsNow = usdOf(held);
  const owedNow = usdOf(owed);

  // Equity built: each current Liability linked to a current Holding.
  const start = yearBefore(today);
  const pairs = liabilities.flatMap((l) => {
    const h = holdings.find((x) => x.id === l.linkedHoldingId);
    return h ? [{ h, l }] : [];
  });
  const equityOn = (h: Held, l: Owed, date: string) => {
    const fxRate = (country: "US" | "IN") => (country === "US" ? 1 : fxRateOn(rates, date).rate);
    return equity(
      {
        native: valueOn(historyItem(h), date, today),
        fxRate: fxRate(h.country),
      },
      {
        native: valueOn(historyItem(l), date, today),
        fxRate: fxRate(l.country),
      },
    );
  };
  const equityNow = pairs.reduce((sum, { h, l }) => sum + equityOn(h, l, today), 0);
  // Like-for-like: only pairs whose both sides have a Valuation by the start.
  const counted = pairs.filter(({ h, l }) =>
    [h, l].every((i) => i.valuations.some((v) => v.date <= start)),
  );
  const equityChange = counted.length
    ? counted.reduce((sum, { h, l }) => sum + equityOn(h, l, today) - equityOn(h, l, start), 0)
    : null;

  const assetsChange = setTwelveMonthChange(held, ctx, "holdings");
  const paidDown = setTwelveMonthChange(owed, ctx, "liabilities");
  const n = holdings.length;
  const stats: Cards["stats"] = {
    assets: {
      label: "Total assets",
      value: usd(assetsNow),
      detail: `${n} ${plural(n, "account or asset", "accounts & assets")} · ${signedCompact(assetsChange?.amount)} in 12 mo`,
      href: hrefFor({ kind: "assets" }, existing),
    },
    liabilities: {
      label: "Liabilities",
      value: usd(owedNow),
      detail: liabilities.length
        ? `${liabilities.length} ${plural(liabilities.length, "loan", "loans")} · ${compact(paidDown?.amount)} paid down in 12 mo`
        : "No loans",
      href: hrefFor({ kind: "liabilities" }, existing),
    },
    equity: {
      label: "Equity built",
      value: usd(equityNow),
      detail: pairs.length
        ? `Across ${pairs.length} financed ${plural(pairs.length, "asset", "assets")} · ${signedCompact(equityChange)} in 12 mo`
        : "No loans linked to assets",
      href: hrefFor({ kind: "growth" }, existing),
    },
  };

  const equityRows: EquityRow[] = pairs.map(({ h, l }) => {
    const rate = (c: "US" | "IN") => (c === "US" ? 1 : fxRateOn(rates, today).rate);
    const value = { native: h.currentValue, fxRate: rate(h.country) };
    const balance = { native: l.currentBalance, fxRate: rate(l.country) };
    const owned = percentOwned(value, balance);
    const change = [h, l].every((i) => i.valuations.some((v) => v.date <= start))
      ? equityOn(h, l, today) - equityOn(h, l, start)
      : null;
    return {
      id: h.id,
      name: h.name,
      equity: usd(equityOn(h, l, today)),
      pct: owned * 100,
      detail: `${Math.round(owned * 100)}% owned · ${signedCompact(change)} in 12 mo`,
      breakdown: `${compact(value.native / value.fxRate)} value − ${compact(balance.native / balance.fxRate)} loan`,
      href: hrefFor({ kind: "holding", id: h.id }, existing),
    };
  });

  const rows = (Object.keys(CLASS_TOKENS) as AssetClassId[])
    .flatMap((id) => {
      const inClass = holdings.filter((h) => h.assetClass === id);
      if (inClass.length === 0) return [];
      const items = inClass.map(historyItem);
      const total = usdOf(items);
      const slug = calcClassId(id);
      const row: AllocationRow = {
        id,
        name: ASSET_CLASSES.find((c) => c.id === slug)!.name,
        dot: CLASS_TOKENS[id].cssVar,
        count: inClass.length,
        value: usd(total),
        share: share(total, assetsNow),
        pct: assetsNow === 0 ? 0 : (total / assetsNow) * 100,
        change: signedCompact(setTwelveMonthChange(items, ctx, "holdings")?.amount),
        href: hrefFor({ kind: "assetClass", id }, existing),
      };
      return [{ row, total }];
    })
    .sort((a, b) => b.total - a.total)
    .map((r) => r.row);

  const countries: CountryBlock[] = (["US", "IN"] as const).flatMap((code) => {
    const hs = holdings.filter((h) => h.country === code);
    const ls = liabilities.filter((l) => l.country === code);
    if (hs.length === 0 && ls.length === 0) return [];
    const assets = usdOf(hs.map(historyItem));
    const debt = usdOf(ls.map(historyItem));
    return [
      {
        code,
        name: code === "US" ? "United States" : "India",
        dot: COUNTRY_TOKENS[code].cssVar,
        net: `${usd(assets - debt)} net`,
        detail: `${compact(assets)} assets · ${compact(debt)} debt`,
        share: `${share(assets, assetsNow)} of assets`,
        pct: assetsNow === 0 ? 0 : (assets / assetsNow) * 100,
      },
    ];
  });

  let currencyEffect: CurrencyEffect | null = null;
  if ([...holdings, ...liabilities].some((i) => i.country === "IN") && rates.length) {
    const { currencyEffect: amount } = attributeChange(
      { holdings: held, liabilities: owed },
      rates,
      start,
      today,
      ["US", "India"],
    );
    const stored = data.fx.today?.asOf;
    const stale = stored !== undefined && stored < today ? `, as of ${dayMonth(stored)}` : "";
    const rate = (r: number) => `₹${r.toFixed(2)}`;
    currencyEffect = {
      amount: signed(amount),
      tone: Math.round(amount) === 0 ? null : amount > 0 ? "up" : "down",
      note: `Rupee moved ${rate(fxRateOn(rates, start).rate)} → ${rate(fxRateOn(rates, today).rate)} per $${stale}.`,
    };
  }

  return {
    stats,
    allocation: rows.length ? { rows } : null,
    equity: equityRows.length ? { rows: equityRows } : null,
    countries,
    currencyEffect,
  };
}
