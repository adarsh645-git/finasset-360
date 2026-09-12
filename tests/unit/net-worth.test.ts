import { describe, expect, it } from "vitest";
import { computeNetWorth } from "@/lib/net-worth/compute";
import type { HoldingValuation } from "@/components/portfolio/types";

function valuation(overrides: Partial<HoldingValuation>): HoldingValuation {
  return {
    id: "v1",
    holding_id: "h1",
    amount: 100,
    fx_rate_to_home: 1,
    home_currency_at_recording: "USD",
    recorded_at: "2026-09-01",
    ...overrides,
  };
}

describe("computeNetWorth", () => {
  it("is zero with no as-of date when nothing has been recorded", () => {
    expect(computeNetWorth([])).toEqual({ holdingsTotal: 0, netWorth: 0, asOfDate: null });
  });

  it("sums each Valuation's amount times its own recorded fx_rate_to_home", () => {
    const usd = valuation({ holding_id: "a", amount: 1000, fx_rate_to_home: 1 });
    const eur = valuation({ holding_id: "b", amount: 500, fx_rate_to_home: 1.08 });

    const summary = computeNetWorth([usd, eur]);

    expect(summary.holdingsTotal).toBeCloseTo(1000 + 500 * 1.08);
    expect(summary.netWorth).toBe(summary.holdingsTotal);
  });

  it("uses the rate stored on each row, not a single shared rate — the point of capturing it per Valuation", () => {
    // Same currency pair, two different rates captured on two different
    // days — proves the sum reads each row's own rate rather than
    // recomputing one rate for the whole set.
    const recordedInJanuary = valuation({ holding_id: "a", amount: 100, fx_rate_to_home: 1.1 });
    const recordedInJuly = valuation({ holding_id: "b", amount: 100, fx_rate_to_home: 1.2 });

    const summary = computeNetWorth([recordedInJanuary, recordedInJuly]);

    expect(summary.holdingsTotal).toBeCloseTo(100 * 1.1 + 100 * 1.2);
  });

  it("as-of date is the newest recorded_at among the Valuations included", () => {
    const older = valuation({ holding_id: "a", recorded_at: "2026-08-01" });
    const newer = valuation({ holding_id: "b", recorded_at: "2026-09-10" });

    expect(computeNetWorth([older, newer]).asOfDate).toBe("2026-09-10");
    expect(computeNetWorth([newer, older]).asOfDate).toBe("2026-09-10");
  });
});
