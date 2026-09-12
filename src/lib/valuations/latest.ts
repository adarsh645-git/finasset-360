import type { HoldingValuation } from "@/components/portfolio/types";

/** The most recent Valuation per Holding, from a list already ordered
 * newest-recorded-date first. The unique `(holding_id, recorded_at)`
 * constraint (docs/SPEC.md) means a same-day correction upserts in place
 * rather than adding a row, so at most one row exists per Holding per date
 * — the first row seen per `holding_id` is already its latest. */
export function latestValuationByHolding(
  valuations: HoldingValuation[],
): Map<string, HoldingValuation> {
  const latest = new Map<string, HoldingValuation>();
  for (const valuation of valuations) {
    if (!latest.has(valuation.holding_id)) {
      latest.set(valuation.holding_id, valuation);
    }
  }
  return latest;
}
