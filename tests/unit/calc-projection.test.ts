import { describe, expect, it } from "vitest";
import { projectHoldings, projectLiabilities, projectPortfolio, resolveAssumptions } from "@/lib/calc";
import type { AssetClassId, Holding, Liability } from "@/lib/calc";

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

describe("projection of Liabilities", () => {
  const FX = 83.4;
  const loan = (balance: number, apr: number, monthlyPayment: number, country: "US" | "IN" = "US"): Liability => ({
    id: "l1",
    country,
    balance,
    apr,
    monthlyPayment,
  });
  const project = (liabilities: Liability[], assumptions = {}) =>
    projectLiabilities({ liabilities, assumptions, fxRate: FX })[0];

  it("PR-08 payoff month matches the annuity formula and the balance stays 0 after", () => {
    const result = project([loan(200_000, 0.06, 2_000)], { horizonYears: 20 });
    expect(result.payoffMonth).toBe(139);
    expect(result.notOnTrack).toBe(false);
    expect(result.nativeBalances[138]).toBeGreaterThan(0);
    expect(result.nativeBalances.slice(139).every((b) => b === 0)).toBe(true);
  });

  it("PR-09 a Liability at zero balance is already paid off", () => {
    const result = project([loan(0, 0.06, 500)]);
    expect(result.payoffMonth).toBe(0);
    expect(result.interestRemaining).toBe(0);
    expect(result.notOnTrack).toBe(false);
    expect(result.nativeBalances.every((b) => b === 0)).toBe(true);
  });

  it("PR-11 interest remaining equals total paid minus today's balance", () => {
    const i = 0.005;
    const balanceAfter = (k: number) => 200_000 * (1 + i) ** k - (2_000 * ((1 + i) ** k - 1)) / i;
    const lastPayment = balanceAfter(138) * (1 + i);
    const totalPaid = 138 * 2_000 + lastPayment;
    const result = project([loan(200_000, 0.06, 2_000)], { horizonYears: 20 });
    expect(Math.abs(result.interestRemaining! - (totalPaid - 200_000))).toBeLessThan(0.01);
  });

  it("PR-12 payoff after the horizon is still reported", () => {
    const result = project([loan(200_000, 0.06, 2_000)], { horizonYears: 5 });
    expect(result.payoffMonth).toBe(139);
    expect(result.interestRemaining).toBeGreaterThan(0);
    expect(result.nativeBalances).toHaveLength(61);
    expect(result.nativeBalances[60]).toBeGreaterThan(0);
  });

  it.each([
    [900, true],
    [1000, true],
    [1001, true],
    [1100, false],
  ])("PR-13 balance 120000 at 10%% with payment %i is Not on track: %s", (payment, flag) => {
    expect(project([loan(120_000, 0.1, payment)]).notOnTrack).toBe(flag);
  });

  it("PR-13 a payment of 1,100 pays off in month 289", () => {
    expect(project([loan(120_000, 0.1, 1_100)]).payoffMonth).toBe(289);
  });

  it("PR-14 a Not on track Liability grows and has no payoff", () => {
    const result = project([loan(120_000, 0.1, 900)]);
    expect(result.nativeBalances[1]).toBeCloseTo(120_100, 6);
    result.nativeBalances.slice(1).forEach((b, k) => expect(b).toBeGreaterThan(result.nativeBalances[k]));
    expect(result.payoffMonth).toBeUndefined();
    expect(result.interestRemaining).toBeUndefined();
  });

  it("PR-14 India balances convert at today's FX Rate", () => {
    const result = project([loan(8_340_000, 0, 100_000, "IN")]);
    expect(result.usdBalances[0]).toBeCloseTo(100_000, 6);
  });
});

describe("Net Worth nets Liabilities against Holdings", () => {
  const FX = 83.4;
  const holdings: Holding[] = [
    { id: "h1", country: "US", assetClass: "stocks", value: 300_000 },
    { id: "h2", country: "IN", assetClass: "realEstate", value: 16_680_000 },
  ];
  const liabilities = (payment: number): Liability[] => [
    { id: "l1", country: "US", balance: 200_000, apr: 0.06, monthlyPayment: payment },
    { id: "l2", country: "IN", balance: 4_170_000, apr: 0.09, monthlyPayment: 60_000 },
  ];
  const netWorth = (payment: number) =>
    projectPortfolio({ holdings, liabilities: liabilities(payment), assumptions: {}, fxRate: FX }).netWorthUsd;

  it("PR-04 month 0 equals today's Net Worth", () => {
    expect(netWorth(2_000)[0]).toBeCloseTo(300_000 + 200_000 - 200_000 - 50_000, 6);
  });

  it("PR-10 a higher Monthly payment strictly raises Net Worth until the earlier payoff", () => {
    const low = netWorth(2_000);
    const high = netWorth(2_500);
    expect(high[0]).toBe(low[0]);
    const earlierPayoff = projectLiabilities({
      liabilities: [liabilities(2_500)[0]],
      assumptions: {},
      fxRate: FX,
    })[0].payoffMonth!;
    for (let k = 1; k <= earlierPayoff; k++) expect(high[k]).toBeGreaterThan(low[k]);
  });
});

describe("Monthly savings and roll-ups", () => {
  const FX = 80;
  const run = (
    assumptions: Parameters<typeof projectPortfolio>[0]["assumptions"],
    holdings: Holding[] = [],
    liabilities: Liability[] = [],
  ) => projectPortfolio({ holdings, liabilities, assumptions, fxRate: FX });

  it("PR-15 level savings match the annuity formula", () => {
    const result = run({ US: { stocks: 0.07, monthlySavings: 1_000 }, savingsGrowth: 0 });
    const m = 1.07 ** (1 / 12) - 1;
    const expected = (1_000 * ((1 + m) ** 120 - 1)) / m;
    expect(result.savings.US.nativePool[120]).toBeCloseTo(expected, 2);
    expect(result.savings.US.nativePool[0]).toBe(0);
  });

  it("PR-16 savings step up once a year", () => {
    const pool = run({ US: { stocks: 0, monthlySavings: 1_000 }, savingsGrowth: 0.1 }).savings.US.nativePool;
    expect(pool[12]).toBeCloseTo(12_000, 6);
    expect(pool[13]).toBeCloseTo(13_100, 6);
    expect(pool[24]).toBeCloseTo(25_200, 6);
  });

  it("PR-17 blank savings reproduce the no-savings Projection", () => {
    const holdings: Holding[] = [{ id: "h", country: "US", assetClass: "stocks", value: 50_000 }];
    const liabilities: Liability[] = [{ id: "l", country: "IN", balance: 8_000_000, apr: 0.09, monthlyPayment: 80_000 }];
    const result = run({}, holdings, liabilities);
    expect(result.liabilities[0].payoffMonth ?? Infinity).toBeGreaterThan(120);
    for (const country of ["US", "IN"] as const) {
      expect(result.savings[country].usdPool.every((v) => v === 0)).toBe(true);
    }
    expect(result.totals.savingsUsd.every((v) => v === 0)).toBe(true);
    result.netWorthUsd.forEach((nw, k) => {
      expect(nw).toBeCloseTo(result.holdings.totalUsd[k] - result.liabilities[0].usdBalances[k], 6);
    });
  });

  const indiaLoan = (balance: number, payment: number): Liability => ({
    id: "l",
    country: "IN",
    balance,
    apr: 0,
    monthlyPayment: payment,
  });

  it("PR-18 a freed payment starts the month after payoff", () => {
    const result = run({}, [], [indiaLoan(600_000, 20_000)]);
    expect(result.liabilities[0].payoffMonth).toBe(30);
    const amounts = result.savings.IN.monthlyAmounts;
    expect(amounts[30]).toBe(0);
    expect(amounts[31]).toBe(20_000);
    expect(amounts[1]).toBe(0);
  });

  it("PR-19 a freed payment does not rise with savings growth", () => {
    const result = run(
      { IN: { monthlySavings: 50_000 }, savingsGrowth: 0.05 },
      [],
      [indiaLoan(580_000, 20_000)],
    );
    expect(result.liabilities[0].payoffMonth).toBe(29);
    const amounts = result.savings.IN.monthlyAmounts;
    expect(amounts[30]).toBeCloseTo(50_000 * 1.05 ** 2 + 20_000, 6);
    expect(amounts[37]).toBeCloseTo(50_000 * 1.05 ** 3 + 20_000, 6);
  });

  const full = () =>
    run(
      { US: { monthlySavings: 1_000 }, IN: { monthlySavings: 40_000 }, savingsGrowth: 0.03, horizonYears: 5 },
      [
        { id: "a", country: "US", assetClass: "realEstate", value: 300_000 },
        { id: "b", country: "US", assetClass: "cash", value: 20_000 },
        { id: "c", country: "IN", assetClass: "stocks", value: 2_000_000 },
        { id: "d", country: "IN", assetClass: "crypto", value: 500_000 },
        { id: "e", country: "IN", assetClass: "metals", value: 700_000 },
        { id: "f", country: "US", assetClass: "vehiclesOther", value: 15_000 },
      ],
      [
        { id: "l1", country: "US", balance: 200_000, apr: 0.06, monthlyPayment: 2_000 },
        { id: "l2", country: "IN", balance: 1_000_000, apr: 0.09, monthlyPayment: 30_000 },
      ],
    );

  it("PR-20 totals reconcile at every month", () => {
    const r = full();
    const classes = Object.keys(r.assetClassUsd) as AssetClassId[];
    r.totals.assetsUsd.forEach((assets, k) => {
      expect(classes.reduce((s, c) => s + r.assetClassUsd[c][k], 0)).toBeCloseTo(assets, 6);
      expect(r.countries.US.netUsd[k] + r.countries.IN.netUsd[k]).toBeCloseTo(r.netWorthUsd[k], 6);
      expect(r.netWorthUsd[k]).toBeCloseTo(assets - r.totals.liabilitiesUsd[k], 6);
      expect(r.countries.US.assetsUsd[k] + r.countries.IN.assetsUsd[k]).toBeCloseTo(assets, 6);
      for (const c of ["US", "IN"] as const) {
        const byClass = classes.reduce((s, id) => s + r.countryAssetClassUsd[c][id][k], 0);
        expect(byClass).toBeCloseTo(r.countries[c].assetsUsd[k], 6);
      }
      expect(r.countries.US.savingsUsd[k] + r.countries.IN.savingsUsd[k]).toBeCloseTo(r.totals.savingsUsd[k], 6);
    });
  });

  it("PR-21 savings count in the Stocks class but in no Holding", () => {
    const cash: Holding[] = [{ id: "cash", country: "US", assetClass: "cash", value: 10_000 }];
    const withSavings = run({ US: { monthlySavings: 1_000 } }, cash);
    withSavings.assetClassUsd.stocks.forEach((v, k) => expect(v).toBeCloseTo(withSavings.savings.US.usdPool[k], 6));
    const without = run({}, cash);
    expect(withSavings.holdings.holdings[0].usdValues).toEqual(without.holdings.holdings[0].usdValues);
  });
});
