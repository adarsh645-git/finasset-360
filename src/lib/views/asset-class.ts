import {
  ASSET_CLASSES,
  fxRateOn,
  netWorthOn,
  resolveAssumptions,
  sampleDates,
  setTwelveMonthChange,
  type AssetClassId as CalcClassId,
} from "@/lib/calc";
import type { ChartSeries, Point } from "@/lib/chart";
import { share, signedCompact, usd } from "@/lib/format";
import type { AssetClassId, PortfolioData } from "@/lib/read-model/types";
import { CLASS_TOKENS } from "@/lib/tokens";
import { CLASS_NOUNS } from "@/lib/views/class-nouns";
import { fxRatesOf, usableItems } from "@/lib/views/fx";
import { buildHoldingRow, type HoldingRow } from "@/lib/views/holding-row";
import { ADDING, EXISTING_ROUTES, addAssetHref, hrefFor, type RouteFamily } from "@/lib/views/links";
import { buildPositionsCard, type PositionsCard } from "@/lib/views/positions-card";
import { addMonths, calcAssumptions, projectFromToday } from "@/lib/views/projection";
import { calcClassId, historyItem } from "@/lib/views/shell";

export type AssetClassView = {
  id: AssetClassId;
  slug: string;
  name: string;
  /** CSS variable of the class colour. */
  dot: string;
  breadcrumb: { label: string; href: string | null }[];
  total: string;
  /** "+$12K in 12 mo · 25% of assets · projected at 4%/yr US · 6%/yr India". */
  line: string;
  /** "+ Add to Cash"; the href opens the add-asset modal with the class preselected. */
  add: { label: string; href: string | null };
  /** First-step state in place of the chart and table; null when the class has Holdings. */
  empty: { message: string; addHref: string | null } | null;
  /** Recorded history, then the class Projection; null for an empty class. */
  chart: { today: string; height: number; series: ChartSeries[] } | null;
  rows: HoldingRow[];
  /** Stocks only: the Positions card; null for every other class and for an empty Stocks page. */
  positions: PositionsCard | null;
};

export { sectorsControlLabel, toggleAllSectors, toggleSector } from "@/lib/views/positions-card";

const IDS = Object.keys(CLASS_TOKENS) as AssetClassId[];

/** The read-model class for a URL slug (the read-model id), or null when the slug is not one of the six. */
export const classIdOfSlug = (slug: string): AssetClassId | null =>
  IDS.find((id) => id === slug) ?? null;

const MINUS = "−";
/** 0.035 as "3.5%", -0.09 as "−9%". */
function percent(rate: number): string {
  const n = Number((rate * 100).toFixed(2));
  return (n < 0 ? MINUS : "") + Math.abs(n) + "%";
}

function rateText(data: PortfolioData, slug: string): string {
  const a = resolveAssumptions(calcAssumptions(data));
  const per = (key: "realEstate" | "stocks" | "cash") =>
    `projected at ${percent(a.countries.US[key])}/yr US · ${percent(a.countries.India[key])}/yr India`;
  switch (slug as CalcClassId) {
    case "real-estate":
      return per("realEstate");
    case "stocks":
      return per("stocks");
    case "cash":
      return per("cash");
    case "crypto":
      return `projected at ${percent(a.shared.crypto)}/yr`;
    case "metals":
      return `projected at ${percent(a.shared.metals)}/yr`;
    case "vehicles-and-other":
      return `projected at ${percent(a.shared.vehiclesAndOther)}/yr`;
  }
}

export function buildAssetClassView(
  data: PortfolioData,
  id: AssetClassId,
  {
    existing = EXISTING_ROUTES,
    adding = ADDING,
  }: { existing?: ReadonlySet<RouteFamily>; adding?: boolean } = {},
): AssetClassView {
  const { today } = data;
  const slug = calcClassId(id);
  const name = ASSET_CLASSES.find((c) => c.id === slug)!.name;
  const rates = fxRatesOf(data);
  const fxRate = rates.length ? fxRateOn(rates, today).rate : 1;
  const current = usableItems(data.holdings, rates).filter((h) => h.archivedAt === null);
  const inClass = current.filter((h) => h.assetClass === id);

  const items = inClass.map(historyItem);
  const classTotal = netWorthOn({ holdings: items, liabilities: [] }, rates, today, today);
  const assetsTotal = netWorthOn({ holdings: current.map(historyItem), liabilities: [] }, rates, today, today);
  const change = setTwelveMonthChange(items, { fxRates: rates, today }, "holdings");

  const path = `/assets/${id}`;
  const addHref = adding ? `${addAssetHref(path)}&class=${id}` : null;
  const plural = CLASS_NOUNS[id].many;

  const rows = inClass
    .map((h) => buildHoldingRow(h, { today, fxRate, existing }))
    .sort((a, b) => b.usdValue - a.usdValue);

  return {
    id,
    slug: id,
    name,
    dot: CLASS_TOKENS[id].cssVar,
    breadcrumb: [
      { label: "Assets", href: hrefFor({ kind: "assets" }, existing) },
      { label: name, href: null },
    ],
    total: usd(classTotal),
    line: `${signedCompact(change?.amount)} in 12 mo · ${share(classTotal, assetsTotal)} of assets · ${rateText(data, slug)}`,
    add: { label: `+ Add to ${name}`, href: addHref },
    empty: inClass.length === 0 ? { message: `No ${plural} in ${name} yet`, addHref } : null,
    chart: inClass.length === 0 ? null : { today, height: 280, series: [classSeries()] },
    rows,
    positions: id === "stocks" ? buildPositionsCard(inClass, { today, fxRate, path }) : null,
  };

  function classSeries(): ChartSeries {
    const first =
      inClass
        .flatMap((h) => h.valuations.map((v) => v.date))
        .sort()[0] ?? inClass.map((h) => h.createdAt.slice(0, 10)).sort()[0]!;
    const points: Point[] = sampleDates(first, first, today).map((date) => ({
      date,
      value: netWorthOn({ holdings: items, liabilities: [] }, rates, date, today),
    }));
    // calc's Projection of the class (Stocks includes the Monthly savings pool), both Countries.
    const { classes } = projectFromToday(data);
    const calcId = slug as CalcClassId;
    classes.US[calcId].forEach((us, k) =>
      points.push({ date: addMonths(today, k + 1), value: us + classes.India[calcId][k]! }),
    );
    return { name, color: `var(${CLASS_TOKENS[id].cssVar})`, points, area: true, areaOpacity: 0.1, width: 2, dot: true, bold: true };
  }
}
