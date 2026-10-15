import { describe, expect, it } from "vitest";
import { ASSET_CLASSES, project, resolveAssumptions } from "@/lib/calc";
import type { AssetClassId, Country, ProjectionHolding } from "@/lib/calc";

const blank = resolveAssumptions({});

describe("PR-01 Each blank assumption resolves to its default", () => {
  const cases: [string, () => number, number][] = [
    ["US inflation", () => blank.countries.US.inflation, 0.03],
    ["US Real estate", () => blank.countries.US.realEstate, 0.04],
    ["US Stocks", () => blank.countries.US.stocks, 0.07],
    ["US Cash", () => blank.countries.US.cash, 0.035],
    ["India inflation", () => blank.countries.India.inflation, 0.05],
    ["India Real estate", () => blank.countries.India.realEstate, 0.06],
    ["India Stocks", () => blank.countries.India.stocks, 0.11],
    ["India Cash", () => blank.countries.India.cash, 0.065],
    ["Crypto", () => blank.shared.crypto, 0.05],
    ["Metals", () => blank.shared.metals, 0.04],
    ["Vehicles & other", () => blank.shared.vehiclesAndOther, -0.09],
    ["US Monthly savings", () => blank.countries.US.monthlySavings, 0],
    ["India Monthly savings", () => blank.countries.India.monthlySavings, 0],
    ["savings growth rate", () => blank.savingsGrowth, 0],
    ["horizon", () => blank.horizonYears, 10],
  ];

  it.each(cases)("PR-01 %s", (_name, actual, expected) => {
    expect(actual()).toBe(expected);
  });

  it("PR-01 a filled-in 0 is kept, and null counts as blank", () => {
    const r = resolveAssumptions({
      countries: { US: { stocks: 0, realEstate: null, monthlySavings: 0 } },
      shared: { crypto: 0 },
      savingsGrowth: 0,
      horizonYears: 0,
    });
    expect(r.countries.US.stocks).toBe(0);
    expect(r.countries.US.realEstate).toBe(0.04);
    expect(r.shared.crypto).toBe(0);
    expect(r.horizonYears).toBe(0);
    expect(r.countries.India.stocks).toBe(0.11);
  });

  it("PR-01 the six Asset Classes carry their rate scope", () => {
    const scopes = Object.fromEntries(ASSET_CLASSES.map((c) => [c.id, c.rateScope]));
    expect(scopes).toEqual({
      "real-estate": "country",
      stocks: "country",
      cash: "country",
      crypto: "shared",
      metals: "shared",
      "vehicles-and-other": "shared",
    });
  });
});

const FX = 83.4;
const holding = (country: Country, assetClass: AssetClassId, currentValue: number): ProjectionHolding => ({
  id: "h1",
  country,
  assetClass,
  currentValue,
});
const run = (holdings: ProjectionHolding[], assumptions = {}) =>
  project({ holdings, assumptions, fxRate: FX });

describe("PR-02 A filled-in zero rate overrides the default", () => {
  it("PR-02 a $100,000 US Stocks Holding stays $100,000 at 0%", () => {
    const { holdings } = run([holding("US", "stocks", 100_000)], {
      countries: { US: { stocks: 0 } },
    });
    expect(holdings[0].usd).toHaveLength(121);
    expect(holdings[0].usd.every((v) => v === 100_000)).toBe(true);
  });
});

describe("PR-03 Series length follows the horizon", () => {
  it.each([
    [1, 13],
    [10, 121],
    [40, 481],
  ])("PR-03 %i years gives %i points, month 0 being today", (years, points) => {
    const result = run([holding("US", "stocks", 500)], { horizonYears: years });
    expect(result.holdings[0].native).toHaveLength(points);
    expect(result.holdings[0].usd).toHaveLength(points);
    expect(result.totalHoldingsUsd).toHaveLength(points);
    expect(result.holdings[0].native[0]).toBe(500);
  });

  it("PR-03 a blank horizon is 10 years", () => {
    expect(run([holding("US", "stocks", 500)]).holdings[0].native).toHaveLength(121);
  });
});

describe("PR-05 An empty Portfolio projects to zero", () => {
  it("PR-05 every series is 0 at every month", () => {
    const result = run([]);
    expect(result.holdings).toEqual([]);
    expect(result.totalHoldingsUsd).toHaveLength(121);
    expect(result.totalHoldingsUsd.every((v) => v === 0)).toBe(true);
  });
});

describe("PR-06 A Holding compounds at the rate its class and Country select", () => {
  it.each<[Country, AssetClassId, number]>([
    ["US", "stocks", 0.07],
    ["India", "stocks", 0.11],
    ["India", "real-estate", 0.06],
    ["US", "cash", 0.035],
    ["US", "vehicles-and-other", -0.09],
    ["India", "vehicles-and-other", -0.09],
    ["India", "crypto", 0.05],
  ])("PR-06 %s %s at %d", (country, assetClass, rate) => {
    const { holdings } = run([holding(country, assetClass, 100_000)]);
    expect(holdings[0].native[24]).toBeCloseTo(100_000 * (1 + rate) ** 2, 6);
    expect(holdings[0].native[5]).toBeCloseTo(100_000 * (1 + rate) ** (5 / 12), 6);
  });

  it("PR-06 a shared rate set by the User applies to both Countries", () => {
    const { holdings } = run([holding("India", "metals", 100)], { shared: { metals: 0.1 } });
    expect(holdings[0].native[12]).toBeCloseTo(110, 9);
  });
});

describe("PR-07 An India Holding converts at today's FX Rate throughout", () => {
  it("PR-07 USD value at every month is native / 83.4", () => {
    const { holdings } = run([holding("India", "cash", 8_340_000)]);
    expect(holdings[0].usd[0]).toBeCloseTo(100_000, 6);
    holdings[0].native.forEach((n, k) => expect(holdings[0].usd[k]).toBeCloseTo(n / 83.4, 6));
  });

  it("PR-07 a US Holding's USD equals its native value", () => {
    const { holdings } = run([holding("US", "cash", 1_000)]);
    expect(holdings[0].usd).toEqual(holdings[0].native);
  });
});
