import { ASSET_CLASSES, staleness } from "@/lib/calc";
import { DASH, inr, signedCompact, signedPct, usd } from "@/lib/format";
import { shortTicker } from "@/lib/market-data/ticker";
import type { HoldingData } from "@/lib/read-model/types";
import { ageCue } from "@/lib/views/age-cue";
import { EXISTING_ROUTES, hrefFor, type RouteFamily } from "@/lib/views/links";
import { calcClassId } from "@/lib/views/shell";

/** One Holding on one line, shared by the Assets list and the class tables. */
export type HoldingRow = {
  id: string;
  name: string;
  /** Positions summary, property line or Description, then the stale cue. */
  subtitle: string;
  /** "US" or "IN", or the class name where the group already shows the Country. */
  badge: string;
  /** Native amount of an India Holding; blank for a US one. */
  native: string;
  usd: string;
  /** Unrealized gain: "+$9.4K · +48%", just the USD figure at a zero Cost Basis, or "—". */
  gain: string;
  /** Holding detail, or null while that route doesn't exist. */
  href: string | null;
  /** USD value, for sorting and sums. */
  usdValue: number;
};

const SHOWN_TICKERS = 3;

function subtitleOf(h: HoldingData): string {
  switch (h.assetClass) {
    case "stocks": {
      const n = h.positions.length;
      if (n === 0) return h.description ?? "";
      const tickers = h.positions.slice(0, SHOWN_TICKERS).map((p) => shortTicker(p.ticker));
      return `${n} ${n === 1 ? "position" : "positions"} · ${tickers.join(", ")}${n > SHOWN_TICKERS ? "…" : ""}`;
    }
    case "realestate":
      return [h.propertyType, h.city].filter(Boolean).join(" · ");
    default:
      return h.description ?? "";
  }
}

function staleCue(h: HoldingData, today: string): string | null {
  const stocks = h.assetClass === "stocks";
  const { ageDays } = staleness(
    stocks
      ? {
          kind: "stocks",
          positions: h.positions.map((p) =>
            p.priceSource === "hand" ? { handPriceDate: p.priceAsOf ?? undefined } : {},
          ),
        }
      : {
          kind: "manual",
          valuations: h.valuations.map((v) => ({
            date: v.date,
            source: v.source === "user" ? "user" : "auto",
          })),
        },
    new Date(`${today}T00:00:00Z`),
  );
  return ageCue(stocks ? "stocks" : "holding", ageDays);
}

/** A Stocks Holding's Cost Basis is Σ shares × average cost; null without Positions. */
export function costBasisOf(h: HoldingData): number | null {
  if (h.assetClass !== "stocks") return h.costBasis;
  return h.positions.length ? h.positions.reduce((s, p) => s + p.shares * p.avgCost, 0) : null;
}

export function buildHoldingRow(
  h: HoldingData,
  {
    today,
    fxRate,
    badge = "country",
    existing = EXISTING_ROUTES,
  }: {
    today: string;
    fxRate: number;
    badge?: "country" | "class";
    existing?: ReadonlySet<RouteFamily>;
  },
): HoldingRow {
  const india = h.country === "IN";
  const rate = india ? fxRate : 1;
  const usdValue = h.currentValue / rate;

  const cue = staleCue(h, today);
  const base = subtitleOf(h);
  const subtitle = cue ? (base ? `${base} · ${cue}` : cue) : base;

  const cost = costBasisOf(h);
  let gain = DASH;
  if (cost !== null) {
    const amount = signedCompact((h.currentValue - cost) / rate);
    gain = cost === 0 ? amount : `${amount} · ${signedPct((h.currentValue - cost) / cost, 0)}`;
  }

  return {
    id: h.id,
    name: h.name,
    subtitle,
    badge:
      badge === "class"
        ? ASSET_CLASSES.find((c) => c.id === calcClassId(h.assetClass))!.name
        : h.country,
    native: india ? inr(h.currentValue) : "",
    usd: usd(usdValue),
    gain,
    href: hrefFor({ kind: "holding", id: h.id }, existing),
    usdValue,
  };
}
