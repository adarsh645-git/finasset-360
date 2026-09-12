import type { HoldingValuation, LiabilityValuation } from "@/components/portfolio/types";

/** The most recent entry per key, from a list already ordered
 * newest-recorded-date first. The unique `(owner_id, recorded_at)`
 * constraint shared by `holding_valuation` and `liability_valuation`
 * (docs/SPEC.md) means a same-day correction upserts in place rather than
 * adding a row, so at most one row exists per owner per date — the first
 * row seen per key is already its latest. */
function latestByKey<T>(items: T[], keyOf: (item: T) => string): Map<string, T> {
  const latest = new Map<string, T>();
  for (const item of items) {
    const key = keyOf(item);
    if (!latest.has(key)) latest.set(key, item);
  }
  return latest;
}

export function latestValuationByHolding(
  valuations: HoldingValuation[],
): Map<string, HoldingValuation> {
  return latestByKey(valuations, (v) => v.holding_id);
}

export function latestValuationByLiability(
  valuations: LiabilityValuation[],
): Map<string, LiabilityValuation> {
  return latestByKey(valuations, (v) => v.liability_id);
}
