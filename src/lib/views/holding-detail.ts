import {
  ASSET_CLASSES,
  attributeChange,
  fxRateOn,
  staleness,
  twelveMonthChange,
  yearBefore,
  type FxRate,
} from "@/lib/calc";
import { DASH, dayMonth, inr, monthLong, native, signed, signedPct, usd } from "@/lib/format";
import type { AssetClassId, PortfolioData } from "@/lib/read-model/types";
import { EXISTING_ROUTES, hrefFor, type RouteFamily } from "@/lib/views/links";
import { updatedCue } from "@/lib/views/age-cue";
import { calcClassId, calcCountry, historyItem } from "@/lib/views/shell";
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
  actions: {
    update: { label: string; href: string };
    edit: { href: string };
  };
  /** Ends with an optional "Your equity" card that redesign-liabilities appends. */
  stats: DetailStat[];
  /** Slot for redesign-liabilities; always empty here. */
  linkedLoan: null;
  // Value over time and the Value log (ticket 2).
  chart: HoldingChart;
  valueLog: ValueLog;
};

const KIND: Record<AssetClassId, string> = {
  stocks: "Brokerage account",
  realestate: "Property",
  cash: "Account",
  crypto: "Account",
  metals: "Asset",
  other: "Asset",
};

const MINUS = "−";
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

  const rates: FxRate[] = [
    ...data.fx.history,
    ...(data.fx.today && !data.fx.history.some((r) => r.date === data.fx.today!.asOf)
      ? [{ date: data.fx.today.asOf, rate: data.fx.today.rate }]
      : []),
  ];
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
  if (holding.costBasis !== null) {
    const gain = holding.currentValue - holding.costBasis;
    stats.push({
      label: "Cost basis",
      value: native(holding.costBasis, calcCountry(holding.country)),
      sub: india ? `≈ ${usd(rateNow && toUsd(holding.costBasis))} today` : "What you paid",
    });
    const pct = holding.costBasis === 0 ? DASH : signedPct(gain / holding.costBasis);
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

  return {
    id: holding.id,
    name: holding.name,
    breadcrumb: [
      { label: "Assets", href: hrefFor({ kind: "assets" }, existing) },
      {
        label: ASSET_CLASSES.find((c) => c.id === slug)!.name,
        href: hrefFor({ kind: "assetClass", id: slug }, existing),
      },
      { label: holding.name, href: null },
    ],
    kind: KIND[holding.assetClass],
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
    linkedLoan: null,
    chart: buildChart(data, holding, rates, hasRate),
    valueLog: buildValueLog(holding, today),
  };
}
