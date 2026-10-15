import { describe, expect, it } from "vitest";
import { ASSET_CLASSES, project } from "@/lib/calc";
import type { AssetClassId, Country, ProjectionHolding } from "@/lib/calc";

const FX = 83.4;
const holding = (
  country: Country,
  assetClass: AssetClassId,
  currentValue: number,
  id = "h1",
): ProjectionHolding => ({ id, country, assetClass, currentValue });
const liability = (
  balance: number,
  apr: number,
  monthlyPayment: number,
  country: Country = "US",
  id = "l1",
) => ({ id, country, balance, apr, monthlyPayment });
const run = (
  assumptions = {},
  holdings: ProjectionHolding[] = [],
  liabilities: ReturnType<typeof liability>[] = [],
) => project({ holdings, liabilities, assumptions, fxRate: FX });

describe("PR-15 Level savings match the annuity formula", () => {
  it("PR-15 US savings pool at month 120 is the annuity future value", () => {
    const r = run({ countries: { US: { monthlySavings: 1_000 } } });
    const m = 1.07 ** (1 / 12) - 1;
    const expected = (1_000 * ((1 + m) ** 120 - 1)) / m;
    expect(r.savings.US.usd[120]).toBeCloseTo(expected, 2);
    expect(r.savings.US.usd[0]).toBe(0);
  });

  it("PR-15 India savings compound at the India Stocks rate and convert at today's FX Rate", () => {
    const r = run({ countries: { India: { monthlySavings: 50_000 } } });
    const m = 1.11 ** (1 / 12) - 1;
    const native = (50_000 * ((1 + m) ** 24 - 1)) / m;
    expect(r.savings.India.native[24]).toBeCloseTo(native, 2);
    expect(r.savings.India.usd[24]).toBeCloseTo(native / FX, 2);
  });
});

describe("PR-16 Savings step up once a year", () => {
  it("PR-16 $1,000 at 0% with 10% growth gives 12,000, 13,100 and 25,200", () => {
    const r = run({
      countries: { US: { monthlySavings: 1_000, stocks: 0 } },
      savingsGrowth: 0.1,
    });
    expect(r.savings.US.usd[12]).toBeCloseTo(12_000, 6);
    expect(r.savings.US.usd[13]).toBeCloseTo(13_100, 6);
    expect(r.savings.US.usd[24]).toBeCloseTo(25_200, 6);
  });
});

describe("PR-17 Blank savings reproduce the no-savings Projection", () => {
  it("PR-17 every savings series is 0 and Net Worth is Holdings minus Liabilities", () => {
    const r = run(
      {},
      [
        holding("US", "stocks", 100_000),
        holding("India", "cash", 8_340_000, "h2"),
      ],
      [liability(20_000, 0.05, 50)],
    );
    expect(r.savings.US.usd.every((v) => v === 0)).toBe(true);
    expect(r.savings.India.usd.every((v) => v === 0)).toBe(true);
    expect(r.totalSavingsUsd.every((v) => v === 0)).toBe(true);
    r.netWorthUsd.forEach((nw, k) => {
      expect(nw).toBeCloseTo(
        r.totalHoldingsUsd[k] - r.totalLiabilitiesUsd[k],
        6,
      );
    });
  });
});

describe("PR-18 A freed payment starts the month after payoff", () => {
  it("PR-18 India's savings amount is 0 to month 30 and 20,000 from month 31", () => {
    // 600,000 at 0% with 20,000 a month pays off in exactly month 30.
    const r = run({}, [], [liability(600_000, 0, 20_000, "India")]);
    expect(r.liabilities[0].payoffMonth).toBe(30);
    expect(r.savings.India.amount[30]).toBe(0);
    expect(r.savings.India.amount[31]).toBe(20_000);
    expect(r.savings.India.amount[120]).toBe(20_000);
    expect(r.savings.US.amount[31]).toBe(0);
  });
});

describe("PR-19 A freed payment does not rise with savings growth", () => {
  it("PR-19 months 30 and 37 add the flat payment to the stepped base", () => {
    // 580,000 at 0% with 20,000 a month pays off in month 29.
    const r = run(
      { countries: { India: { monthlySavings: 50_000 } }, savingsGrowth: 0.05 },
      [],
      [liability(580_000, 0, 20_000, "India")],
    );
    expect(r.liabilities[0].payoffMonth).toBe(29);
    expect(r.savings.India.amount[29]).toBeCloseTo(50_000 * 1.05 ** 2, 6);
    expect(r.savings.India.amount[30]).toBeCloseTo(
      50_000 * 1.05 ** 2 + 20_000,
      6,
    );
    expect(r.savings.India.amount[37]).toBeCloseTo(
      50_000 * 1.05 ** 3 + 20_000,
      6,
    );
  });

  it("PR-19 a Not on track Liability never frees its payment", () => {
    const r = run({}, [], [liability(120_000, 0.1, 900)]);
    expect(r.savings.US.amount.every((v) => v === 0)).toBe(true);
  });
});

describe("PR-20 Totals reconcile at every month", () => {
  const r = run(
    {
      countries: {
        US: { monthlySavings: 1_000 },
        India: { monthlySavings: 50_000 },
      },
      savingsGrowth: 0.03,
    },
    [
      holding("US", "real-estate", 400_000, "a"),
      holding("US", "cash", 20_000, "b"),
      holding("India", "stocks", 5_000_000, "c"),
      holding("India", "crypto", 800_000, "d"),
      holding("US", "metals", 10_000, "e"),
      holding("India", "vehicles-and-other", 600_000, "f"),
    ],
    [
      liability(250_000, 0.06, 2_000),
      liability(1_000_000, 0.09, 30_000, "India", "l2"),
    ],
  );
  const months = r.netWorthUsd.length;

  it("PR-20 Asset Class series sum to total assets, savings within Stocks", () => {
    for (let k = 0; k < months; k++) {
      const sum = ASSET_CLASSES.reduce(
        (s, c) => s + r.assetClasses[c.id][k],
        0,
      );
      expect(sum).toBeCloseTo(r.totalAssetsUsd[k], 6);
      expect(r.totalAssetsUsd[k]).toBeCloseTo(
        r.totalHoldingsUsd[k] + r.totalSavingsUsd[k],
        6,
      );
    }
  });

  it("PR-20 Asset Classes within Countries sum to the Asset Class and the Country", () => {
    for (let k = 0; k < months; k++) {
      for (const c of ASSET_CLASSES) {
        const sum =
          r.countryAssetClasses.US[c.id][k] +
          r.countryAssetClasses.India[c.id][k];
        expect(sum).toBeCloseTo(r.assetClasses[c.id][k], 6);
      }
      for (const country of ["US", "India"] as const) {
        const sum = ASSET_CLASSES.reduce(
          (s, c) => s + r.countryAssetClasses[country][c.id][k],
          0,
        );
        expect(sum).toBeCloseTo(r.countries[country].assetsUsd[k], 6);
      }
    }
  });

  it("PR-20 Countries' net series sum to Net Worth, which is assets minus liabilities", () => {
    for (let k = 0; k < months; k++) {
      const { US, India } = r.countries;
      expect(US.netUsd[k] + India.netUsd[k]).toBeCloseTo(r.netWorthUsd[k], 6);
      expect(r.netWorthUsd[k]).toBeCloseTo(
        r.totalAssetsUsd[k] - r.totalLiabilitiesUsd[k],
        6,
      );
      expect(US.netUsd[k]).toBeCloseTo(
        US.assetsUsd[k] - US.liabilitiesUsd[k],
        6,
      );
      expect(US.assetsUsd[k] + India.assetsUsd[k]).toBeCloseTo(
        r.totalAssetsUsd[k],
        6,
      );
      expect(US.savingsUsd[k] + India.savingsUsd[k]).toBeCloseTo(
        r.totalSavingsUsd[k],
        6,
      );
    }
  });

  it("PR-20 month 0 Net Worth still equals today's", () => {
    expect(r.netWorthUsd[0]).toBeCloseTo(
      400_000 +
        20_000 +
        10_000 +
        (5_000_000 + 800_000 + 600_000) / FX -
        250_000 -
        1_000_000 / FX,
      6,
    );
  });
});

describe("PR-21 Savings count in the Stocks class but in no Holding", () => {
  it("PR-21 Stocks equals the US savings pool and the Cash Holding is unchanged", () => {
    const holdings = [holding("US", "cash", 50_000)];
    const withSavings = run(
      { countries: { US: { monthlySavings: 1_000 } } },
      holdings,
    );
    const without = run({}, holdings);
    for (let k = 0; k < withSavings.netWorthUsd.length; k++) {
      expect(withSavings.assetClasses.stocks[k]).toBeCloseTo(
        withSavings.savings.US.usd[k],
        6,
      );
    }
    expect(withSavings.holdings[0].usd).toEqual(without.holdings[0].usd);
    expect(withSavings.holdings[0].native).toEqual(without.holdings[0].native);
    expect(withSavings.countries.US.assetsUsd[120]).toBeCloseTo(
      withSavings.holdings[0].usd[120] + withSavings.savings.US.usd[120],
      6,
    );
  });
});
