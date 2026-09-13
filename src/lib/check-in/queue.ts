import type { Holding, HoldingValuation } from "@/components/portfolio/types";
import { isStale } from "@/lib/valuations/staleness";

export type CheckInScope = "all" | "stale";

/** Which active Holdings a Check-in pass covers (user story 40). "stale"
 * mirrors the dashboard's own staleness list exactly (PortfolioShell's
 * `staleItems`): a Holding with no Valuation yet does not count as stale by
 * that definition, so it only ever appears under "all". Order follows
 * `holdings` as given — callers already pass them in the app's one
 * established order (creation order). */
export function buildCheckInQueue(
  holdings: Holding[],
  latestByHolding: Map<string, HoldingValuation>,
  scope: CheckInScope,
  asOf: Date = new Date(),
): Holding[] {
  if (scope === "all") return holdings;
  return holdings.filter((holding) => {
    const latest = latestByHolding.get(holding.id);
    return latest !== undefined && isStale(latest.recorded_at, asOf);
  });
}
