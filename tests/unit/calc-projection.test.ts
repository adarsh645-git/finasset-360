import { describe, expect, it } from "vitest";
import { resolveAssumptions } from "@/lib/calc";

const BLANK = resolveAssumptions({});

describe("projection defaults", () => {
  it.each([
    ["US inflation", BLANK.US.inflation, 0.03],
    ["US Real estate", BLANK.US.realEstate, 0.04],
    ["US Stocks", BLANK.US.stocks, 0.07],
    ["US Cash", BLANK.US.cash, 0.035],
    ["India inflation", BLANK.IN.inflation, 0.05],
    ["India Real estate", BLANK.IN.realEstate, 0.06],
    ["India Stocks", BLANK.IN.stocks, 0.11],
    ["India Cash", BLANK.IN.cash, 0.065],
    ["Crypto", BLANK.crypto, 0.05],
    ["Metals", BLANK.metals, 0.04],
    ["Vehicles & other", BLANK.vehiclesOther, -0.09],
    ["US Monthly savings", BLANK.US.monthlySavings, 0],
    ["India Monthly savings", BLANK.IN.monthlySavings, 0],
    ["savings growth rate", BLANK.savingsGrowth, 0],
    ["horizon years", BLANK.horizonYears, 10],
  ])("PR-01 blank %s resolves to its default", (_name, actual, expected) => {
    expect(actual).toBeCloseTo(expected, 10);
  });

  it("PR-01 a filled-in 0 is kept, not replaced by the default", () => {
    const resolved = resolveAssumptions({ US: { stocks: 0 }, crypto: 0, horizonYears: 0 });
    expect(resolved.US.stocks).toBe(0);
    expect(resolved.crypto).toBe(0);
    expect(resolved.horizonYears).toBe(0);
    expect(resolved.IN.stocks).toBeCloseTo(0.11, 10);
  });
});
