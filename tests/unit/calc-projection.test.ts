import { describe, expect, it } from "vitest";
import { ASSET_CLASSES, resolveAssumptions } from "@/lib/calc";

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
