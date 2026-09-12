import { describe, expect, it } from "vitest";
import { latestValuationByHolding } from "@/lib/valuations/latest";
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

describe("latestValuationByHolding", () => {
  it("returns an empty map for an empty list", () => {
    expect(latestValuationByHolding([]).size).toBe(0);
  });

  it("picks the first row seen per Holding, given newest-first input", () => {
    const newer = valuation({ id: "v2", recorded_at: "2026-09-10", amount: 200 });
    const older = valuation({ id: "v1", recorded_at: "2026-09-01", amount: 100 });

    const latest = latestValuationByHolding([newer, older]);

    expect(latest.get("h1")).toBe(newer);
  });

  it("keeps one entry per distinct Holding", () => {
    const forA = valuation({ id: "va", holding_id: "a", recorded_at: "2026-09-05" });
    const forB = valuation({ id: "vb", holding_id: "b", recorded_at: "2026-09-06" });

    const latest = latestValuationByHolding([forB, forA]);

    expect(latest.size).toBe(2);
    expect(latest.get("a")).toBe(forA);
    expect(latest.get("b")).toBe(forB);
  });
});
