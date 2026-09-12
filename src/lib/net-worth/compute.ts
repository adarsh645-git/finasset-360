import type { HoldingValuation } from "@/components/portfolio/types";

export type NetWorthSummary = {
  holdingsTotal: number;
  netWorth: number;
  /** The newest `recorded_at` among the Valuations included, or `null` if
   * nothing has ever been recorded. */
  asOfDate: string | null;
};

/** Net Worth as current Holdings minus current Liabilities (docs/SPEC.md,
 * user story 48). Liabilities don't exist yet (ticket 05 adds them and does
 * the netting), so `netWorth` is Holdings-only for now. Each Valuation's
 * home-currency value is `amount * fx_rate_to_home` — the rate captured at
 * *that* Valuation's own recording time, per user story 26 — never today's
 * rate, so this sum is correct even when Holdings carry different
 * currencies or were recorded on different days. */
export function computeNetWorth(latestValuations: HoldingValuation[]): NetWorthSummary {
  let holdingsTotal = 0;
  let asOfDate: string | null = null;

  for (const valuation of latestValuations) {
    holdingsTotal += valuation.amount * valuation.fx_rate_to_home;
    if (asOfDate === null || valuation.recorded_at > asOfDate) {
      asOfDate = valuation.recorded_at;
    }
  }

  return { holdingsTotal, netWorth: holdingsTotal, asOfDate };
}
