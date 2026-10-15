import { describe, expect, it } from "vitest";
import { projectHoldings, resolveAssumptions } from "@/lib/calc";
import type { AssetClassId, Holding } from "@/lib/calc";

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

describe("projection of Holdings", () => {
  const FX = 83.4;
  const holding = (country: "US" | "IN", assetClass: AssetClassId, value = 100_000): Holding => ({
    id: "h1",
    country,
    assetClass,
    value,
  });
  const project = (holdings: Holding[], assumptions = {}) =>
    projectHoldings({ holdings, assumptions, fxRate: FX });

  it("PR-02 a filled-in zero rate keeps the value flat in every month", () => {
    const result = project([holding("US", "stocks")], { US: { stocks: 0 } });
    expect(result.holdings[0].nativeValues.every((v) => v === 100_000)).toBe(true);
  });

  it.each([
    [1, 13],
    [10, 121],
    [40, 481],
  ])("PR-03 a %i-year horizon gives %i monthly points", (years, points) => {
    const result = project([holding("US", "cash")], { horizonYears: years });
    expect(result.holdings[0].nativeValues).toHaveLength(points);
    expect(result.holdings[0].usdValues).toHaveLength(points);
    expect(result.totalUsd).toHaveLength(points);
  });

  it("PR-03 month 0 equals the current value", () => {
    const result = project([holding("IN", "stocks", 250_000)]);
    expect(result.holdings[0].nativeValues[0]).toBe(250_000);
  });

  it("PR-05 an empty Portfolio projects to zero at every month", () => {
    const result = project([], { horizonYears: 2 });
    expect(result.holdings).toEqual([]);
    expect(result.totalUsd).toHaveLength(25);
    expect(result.totalUsd.every((v) => v === 0)).toBe(true);
  });

  it.each([
    ["US", "stocks", 0.07],
    ["IN", "stocks", 0.11],
    ["IN", "realEstate", 0.06],
    ["US", "cash", 0.035],
    ["US", "vehiclesOther", -0.09],
    ["IN", "vehiclesOther", -0.09],
    ["IN", "crypto", 0.05],
  ] as const)("PR-06 %s %s compounds at %d", (country, assetClass, rate) => {
    const values = project([holding(country, assetClass)]).holdings[0].nativeValues;
    expect(values[24]).toBeCloseTo(100_000 * (1 + rate) ** 2, 6);
    expect(values[6]).toBeCloseTo(100_000 * (1 + rate) ** 0.5, 6);
  });

  it("PR-07 India figures convert at today's FX Rate at every month", () => {
    const { nativeValues, usdValues } = project([holding("IN", "cash", 8_340_000)]).holdings[0];
    nativeValues.forEach((native, k) => expect(usdValues[k]).toBeCloseTo(native / 83.4, 6));
    expect(usdValues[0]).toBeCloseTo(100_000, 6);
  });

  it("PR-07 US figures are already USD", () => {
    const { nativeValues, usdValues } = project([holding("US", "stocks")]).holdings[0];
    expect(usdValues).toEqual(nativeValues);
  });
});
