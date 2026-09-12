import type { HoldingValuation, LiabilityValuation } from "@/components/portfolio/types";

export type NetWorthSummary = {
  holdingsTotal: number;
  liabilitiesTotal: number;
  netWorth: number;
  /** The newest `recorded_at` among the Valuations included, or `null` if
   * nothing has ever been recorded. */
  asOfDate: string | null;
};

function sumHomeCurrency(valuations: Array<{ amount: number; fx_rate_to_home: number }>): number {
  let total = 0;
  for (const valuation of valuations) {
    total += valuation.amount * valuation.fx_rate_to_home;
  }
  return total;
}

function newestRecordedAt(
  valuations: Array<{ recorded_at: string }>,
  startingFrom: string | null,
): string | null {
  let newest = startingFrom;
  for (const valuation of valuations) {
    if (newest === null || valuation.recorded_at > newest) {
      newest = valuation.recorded_at;
    }
  }
  return newest;
}

/** Net Worth as current Holdings minus current Liabilities (docs/SPEC.md,
 * user story 48). Each Valuation's home-currency value is
 * `amount * fx_rate_to_home` — the rate captured at *that* Valuation's own
 * recording time, per user story 26 — never today's rate, so this sum is
 * correct even when Holdings and Liabilities carry different currencies or
 * were recorded on different days. */
export function computeNetWorth(
  latestHoldingValuations: HoldingValuation[],
  latestLiabilityValuations: LiabilityValuation[] = [],
): NetWorthSummary {
  const holdingsTotal = sumHomeCurrency(latestHoldingValuations);
  const liabilitiesTotal = sumHomeCurrency(latestLiabilityValuations);
  const asOfDate = newestRecordedAt(
    latestLiabilityValuations,
    newestRecordedAt(latestHoldingValuations, null),
  );

  return { holdingsTotal, liabilitiesTotal, netWorth: holdingsTotal - liabilitiesTotal, asOfDate };
}
