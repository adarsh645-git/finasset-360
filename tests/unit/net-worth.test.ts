import { describe, expect, it } from "vitest";
import { computeNetWorth } from "@/lib/net-worth/compute";
import type { HoldingValuation, LiabilityValuation } from "@/components/portfolio/types";

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

function liabilityValuation(overrides: Partial<LiabilityValuation>): LiabilityValuation {
  return {
    id: "v1",
    liability_id: "l1",
    amount: 100,
    fx_rate_to_home: 1,
    home_currency_at_recording: "USD",
    recorded_at: "2026-09-01",
    ...overrides,
  };
}

describe("computeNetWorth", () => {
  it("is zero with no as-of date when nothing has been recorded", () => {
    expect(computeNetWorth([])).toEqual({
      holdingsTotal: 0,
      liabilitiesTotal: 0,
      netWorth: 0,
      asOfDate: null,
    });
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

  it("nets a multi-currency mix of Holdings and Liabilities correctly", () => {
    // A USD house and a EUR brokerage account, netted against a USD
    // mortgage and a GBP credit card — each valued in home currency (USD)
    // via its own stored fx_rate_to_home, exactly as a real multi-currency
    // Portfolio would be.
    const house = valuation({ holding_id: "house", amount: 500_000, fx_rate_to_home: 1 });
    const brokerage = valuation({ holding_id: "brokerage", amount: 50_000, fx_rate_to_home: 1.08 });

    const mortgage = liabilityValuation({
      liability_id: "mortgage",
      amount: 300_000,
      fx_rate_to_home: 1,
    });
    const creditCard = liabilityValuation({
      liability_id: "credit-card",
      amount: 2_000,
      fx_rate_to_home: 1.27,
    });

    const summary = computeNetWorth([house, brokerage], [mortgage, creditCard]);

    const expectedHoldings = 500_000 + 50_000 * 1.08;
    const expectedLiabilities = 300_000 + 2_000 * 1.27;
    expect(summary.holdingsTotal).toBeCloseTo(expectedHoldings);
    expect(summary.liabilitiesTotal).toBeCloseTo(expectedLiabilities);
    expect(summary.netWorth).toBeCloseTo(expectedHoldings - expectedLiabilities);
  });

  it("as-of date considers both Holding and Liability Valuations", () => {
    const holding = valuation({ holding_id: "a", recorded_at: "2026-08-01" });
    const liability = liabilityValuation({ liability_id: "b", recorded_at: "2026-09-10" });

    expect(computeNetWorth([holding], [liability]).asOfDate).toBe("2026-09-10");
  });

  it("defaults to no Liabilities when the second argument is omitted", () => {
    const holding = valuation({ holding_id: "a", amount: 1000 });
    expect(computeNetWorth([holding])).toEqual({
      holdingsTotal: 1000,
      liabilitiesTotal: 0,
      netWorth: 1000,
      asOfDate: "2026-09-01",
    });
  });
});
