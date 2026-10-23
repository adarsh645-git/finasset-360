import {
  ASSET_CLASSES,
  attributeChange,
  fxRateOn,
  staleness,
  twelveMonthChange,
  yearBefore,
} from "@/lib/calc";
import { DASH, dayMonth, inr, monthLong, native, share, signed, signedPct, usd } from "@/lib/format";
import type { AssetClassId, PortfolioData } from "@/lib/read-model/types";
import { EXISTING_ROUTES, hrefFor, type RouteFamily } from "@/lib/views/links";
import { shortTicker } from "@/lib/market-data/ticker";
import { fxRatesOf } from "@/lib/views/fx";
import { ageCue, updatedCue } from "@/lib/views/age-cue";
import { calcClassId, calcCountry, historyItem } from "@/lib/views/shell";
import { buildHoldingEquity, type LinkedLoanCard } from "@/lib/views/holding-equity";
import { buildChart, buildValueLog, type HoldingChart, type ValueLog } from "@/lib/views/holding-history";

export type Crumb = { label: string; href: string | null };
export type DetailStat = { label: string; value: string; sub: string };

export type HoldingDetail = {
  id: string;
  name: string;
  breadcrumb: Crumb[];
  /** "Brokerage account", "Property", "Account" or "Asset". */
  kind: string;
  badges: string[];
  usd: string;
  /** The line under the value; null when there is nothing to say. */
  nativeLine: string | null;
  /** Where a confirmed Delete goes: the class page, or the Overview while that page is off. */
  afterArchive: string;
  actions: {
    update: { label: string; href: string };
    edit: { href: string };
  };
  /** Ends with an optional "Your equity" card that redesign-liabilities appends. */
  stats: DetailStat[];
  /** The Linked loan card; null for a Holding no active loan secures. */
  linkedLoan: LinkedLoanCard | null;
  /** "Positions in this account" and "By sector"; null for every class but Stocks. */
  stocks: StocksSections | null;
  // Value over time and the Value log (ticket 2).
  chart: HoldingChart;
  valueLog: ValueLog;
};

export type StocksPositionRow = {
  ticker: string;
  sector: string;
  /** "30 sh · Apple Inc.", plus " · price N days old" for a stale Hand Price. */
  line: string;
  price: string;
  value: string;
  gain: string;
  weight: string;
  href: string;
};
export type SectorRow = { sector: string; share: string; tickers: string };
export type StocksSections = { subheading: string; positions: StocksPositionRow[]; sectors: SectorRow[] };

const KIND: Record<AssetClassId, string> = {
  stocks: "Brokerage account",
  realestate: "Property",
  cash: "Account",
  crypto: "Account",
  metals: "Asset",
  other: "Asset",
};

const MINUS = "−";
const oneDecimal = (n: number) => n.toFixed(1);
const signedNative = (v: number, country: "US" | "IN") =>
  (v >= 0 ? "+" : MINUS) + native(Math.abs(v), calcCountry(country));

/** The page's model, or null (→ not-found) for an archived, unknown or foreign Holding. */
export function buildHoldingDetail(
  data: PortfolioData,
  { holdingId, existing = EXISTING_ROUTES }: { holdingId: string; existing?: ReadonlySet<RouteFamily> },
): HoldingDetail | null {
  const holding = data.holdings.find((h) => h.id === holdingId && h.archivedAt === null);
  if (!holding) return null;
  const { today } = data;
  const india = holding.country === "IN";

  const rates = fxRatesOf(data);
  const hasRate = !india || rates.length > 0;
  const rateNow = india && hasRate ? fxRateOn(rates, today) : null;
  const toUsd = (nativeAmount: number) => (rateNow ? nativeAmount / rateNow.rate : nativeAmount);

  const item = historyItem(holding);
  const slug = calcClassId(holding.assetClass);
  const path = `/holdings/${holding.id}`;

  // Native line: rate, then Description, then the Stale cue.
  const parts: string[] = [];
  if (india) {
    if (rateNow) {
      const asOf = rateNow.asOf < today ? ` as of ${dayMonth(rateNow.asOf)}` : "";
      parts.push(`${inr(holding.currentValue)} at ₹${rateNow.rate.toFixed(2)}/$${asOf}`);
    } else {
      parts.push(inr(holding.currentValue));
    }
  }
  if (holding.description) parts.push(holding.description);
  const { ageDays } = staleness(
    holding.assetClass === "stocks"
      ? {
          kind: "stocks",
          positions: holding.positions.map((p) => ({
            handPriceDate: p.priceSource === "hand" ? (p.priceAsOf ?? undefined) : undefined,
          })),
        }
      : {
          kind: "manual",
          valuations: holding.valuations.map((v) => ({
            date: v.date,
            source: v.source === "user" ? "user" : "auto",
          })),
        },
    new Date(`${today}T00:00:00Z`),
  );
  let nativeLine = parts.join(" · ");
  const cue = updatedCue(ageDays, { lineEmpty: nativeLine === "" });
  if (cue) nativeLine = nativeLine === "" ? cue : `${nativeLine} ${cue}`;

  const stats: DetailStat[] = [];
  if (holding.assetClass === "realestate" && (holding.propertyType || holding.city)) {
    stats.push({ label: "Property", value: holding.propertyType ?? DASH, sub: holding.city ?? "" });
  }
  // A Stocks Holding's Cost Basis and value come from its Positions (HD-12).
  const fromPositions = holding.assetClass === "stocks";
  const costBasis = fromPositions
    ? holding.positions.reduce((sum, p) => sum + p.shares * p.avgCost, 0)
    : holding.costBasis;
  const worth = fromPositions
    ? holding.positions.reduce((sum, p) => sum + p.shares * p.price, 0)
    : holding.currentValue;
  if (costBasis !== null && (!fromPositions || holding.positions.length > 0)) {
    const gain = worth - costBasis;
    stats.push({
      label: "Cost basis",
      value: native(costBasis, calcCountry(holding.country)),
      sub: india ? `≈ ${usd(rateNow && toUsd(costBasis))} today` : "What you paid",
    });
    const pct = costBasis === 0 ? DASH : signedPct(gain / costBasis);
    stats.push({
      label: "Unrealized gain",
      value: signedNative(gain, holding.country),
      sub: india ? `${pct} · ${signed(rateNow && toUsd(gain))}` : pct,
    });
  }
  if (holding.assetClass === "metals" && holding.quantity !== null && holding.quantity > 0) {
    stats.push({
      label: "Quantity",
      value: `${holding.quantity} ${holding.unit ?? ""}`.trim(),
      sub: `${native(holding.currentValue / holding.quantity, calcCountry(holding.country))} per ${holding.unit ?? "unit"}`,
    });
  }

  // 12-month change: calc's rule, "—" with "Added Mon YYYY" for an item under a year old.
  const added = [...holding.valuations.map((v) => v.date)].sort()[0] ?? holding.createdAt.slice(0, 10);
  const change = hasRate ? twelveMonthChange(item, { fxRates: rates, today }) : undefined;
  stats.push(
    change
      ? {
          label: "12-month change",
          value:
            change.percent === undefined
              ? signed(change.amount)
              : `${signed(change.amount)} (${signedPct(change.percent)})`,
          sub: "In USD terms",
        }
      : { label: "12-month change", value: DASH, sub: `Added ${monthLong(added)}` },
  );

  if (india && rateNow) {
    const start = yearBefore(today);
    const { currencyEffect } = attributeChange(
      { holdings: [item], liabilities: [] },
      rates,
      start,
      today,
      ["India"],
    );
    const rate = (r: number) => `₹${r.toFixed(2)}`;
    stats.push({
      label: "Currency effect, 12 mo",
      value: signed(currencyEffect),
      sub: `${rate(fxRateOn(rates, start).rate)} → ${rate(rateNow.rate)} per $`,
    });
  }

  const equityView = buildHoldingEquity(data, { holdingId, existing });
  if (equityView) stats.push(equityView.stat);

  return {
    id: holding.id,
    name: holding.name,
    breadcrumb: [
      { label: "Assets", href: hrefFor({ kind: "assets" }, existing) },
      {
        label: ASSET_CLASSES.find((c) => c.id === slug)!.name,
        href: hrefFor({ kind: "assetClass", id: holding.assetClass }, existing),
      },
      { label: holding.name, href: null },
    ],
    kind: KIND[holding.assetClass],
    afterArchive: hrefFor({ kind: "assetClass", id: holding.assetClass }, existing) ?? "/",
    badges: india ? ["India", "INR"] : ["United States", "USD"],
    usd: usd(hasRate ? toUsd(item.currentValue ?? 0) : null),
    nativeLine: nativeLine === "" ? null : nativeLine,
    actions: {
      update: {
        label: holding.assetClass === "stocks" ? "Edit positions" : "Update value",
        href: `${path}?modal=update&holding=${holding.id}`,
      },
      edit: { href: `${path}?modal=edit&holding=${holding.id}` },
    },
    stats,
    linkedLoan: equityView?.linkedLoan ?? null,
    stocks: fromPositions ? stocksSections() : null,
    chart: equityView?.chart ?? buildChart(data, holding, rates, hasRate),
    valueLog: buildValueLog(holding, today),
  };

  function stocksSections(): StocksSections {
    const asOf = new Date(`${today}T00:00:00Z`);
    const rows = holding!.positions
      .map((p) => ({ p, usdValue: toUsd(p.shares * p.price) }))
      .sort((a, b) => b.usdValue - a.usdValue);
    const total = rows.reduce((sum, r) => sum + r.usdValue, 0);
    const country = calcCountry(holding!.country);
    const positions = rows.map(({ p, usdValue }) => {
      const { ageDays } = staleness(
        {
          kind: "stocks",
          positions: [{ handPriceDate: p.priceSource === "hand" ? (p.priceAsOf ?? undefined) : undefined }],
        },
        asOf,
      );
      const cue = ageCue("position", ageDays);
      return {
        ticker: shortTicker(p.ticker),
        sector: p.sector,
        line: `${p.shares} sh · ${p.name}${cue ? ` · ${cue}` : ""}`,
        price: native(p.price, country),
        value: usd(hasRate ? usdValue : null),
        gain: p.avgCost === 0 ? DASH : signedPct((p.price - p.avgCost) / p.avgCost, 0),
        weight: share(usdValue, total),
        href: `${path}?position=${encodeURIComponent(`${holding!.id}~${p.ticker}`)}`,
      };
    });
    const bySector = new Map<string, { value: number; tickers: string[] }>();
    for (const { p, usdValue } of rows) {
      const entry = bySector.get(p.sector) ?? { value: 0, tickers: [] };
      entry.value += usdValue;
      entry.tickers.push(shortTicker(p.ticker));
      bySector.set(p.sector, entry);
    }
    const sectors = [...bySector]
      .sort((a, b) => b[1].value - a[1].value)
      .map(([sector, e]) => ({
        sector,
        share: total === 0 ? "0%" : `${oneDecimal((e.value / total) * 100)}%`,
        tickers: e.tickers.join(", "),
      }));
    const n = positions.length;
    return { subheading: `${n} position${n === 1 ? "" : "s"}`, positions, sectors };
  }
}
