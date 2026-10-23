import { staleness, type StalenessInput } from "@/lib/calc";
import { daysOld } from "@/lib/format";
import type { HoldingData, LiabilityData, PortfolioData } from "@/lib/read-model/types";
import { EXISTING_ROUTES, hrefFor, type RouteFamily } from "@/lib/views/links";

export type StaleRow = {
  kind: "holding" | "liability";
  id: string;
  name: string;
  ageDays: number;
  /** A Stocks Holding: its age is the age of its Hand Prices. */
  stocks: boolean;
  /** "47 days old", or "prices 40 days old" for Stocks. */
  age: string;
  /** Detail page, or null while that route doesn't exist. */
  href: string | null;
};

function inputOf(item: HoldingData | LiabilityData): StalenessInput {
  if ("positions" in item && item.assetClass === "stocks") {
    return {
      kind: "stocks",
      positions: item.positions.map((p) =>
        p.priceSource === "hand" && p.priceAsOf ? { handPriceDate: p.priceAsOf } : {},
      ),
    };
  }
  return {
    kind: "manual",
    valuations: item.valuations.map((v) => ({
      date: v.date,
      source: v.source === "user" ? "user" : "auto",
    })),
  };
}

/** Stale current Holdings and Liabilities, oldest first, ties by name. */
export function buildStaleList(
  data: PortfolioData,
  today: string,
  existing: ReadonlySet<RouteFamily> = EXISTING_ROUTES,
): StaleRow[] {
  const now = new Date(`${today}T00:00:00Z`);
  const rows: StaleRow[] = [];
  const add = (kind: StaleRow["kind"], item: HoldingData | LiabilityData) => {
    if (item.archivedAt !== null) return;
    const { ageDays, stale } = staleness(inputOf(item), now);
    if (!stale || ageDays === null) return;
    const stocks = "assetClass" in item && item.assetClass === "stocks";
    rows.push({
      kind,
      id: item.id,
      name: item.name,
      ageDays,
      stocks,
      age: stocks ? `prices ${daysOld(ageDays)}` : daysOld(ageDays),
      href: hrefFor({ kind, id: item.id }, existing),
    });
  };
  data.holdings.forEach((h) => add("holding", h));
  data.liabilities.forEach((l) => add("liability", l));
  return rows.sort((a, b) => b.ageDays - a.ageDays || a.name.localeCompare(b.name));
}
