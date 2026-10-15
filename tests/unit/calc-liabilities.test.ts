import { describe, expect, it } from "vitest";
import { project } from "@/lib/calc";
import type { AssetClassId, Country, ProjectionHolding } from "@/lib/calc";

const FX = 83.4;
const holding = (country: Country, assetClass: AssetClassId, currentValue: number): ProjectionHolding => ({
  id: "h1",
  country,
  assetClass,
  currentValue,
});
const liability = (balance: number, apr: number, monthlyPayment: number, country: Country = "US") => ({
  id: "l1",
  country,
  balance,
  apr,
  monthlyPayment,
});
const run = (
  liabilities: ReturnType<typeof liability>[],
  assumptions = {},
  holdings: ProjectionHolding[] = [],
) => project({ holdings, liabilities, assumptions, fxRate: FX });

describe("PR-04 Month 0 equals today's Net Worth", () => {
  it("PR-04 Net Worth at month 0 is Holdings minus Liabilities in USD at today's FX Rate", () => {
    const result = run(
      [liability(50_000, 0.05, 800), liability(4_170_000, 0.09, 50_000, "India")],
      { countries: { US: { monthlySavings: 1_000 }, India: { monthlySavings: 50_000 } } },
      [holding("US", "stocks", 300_000), holding("India", "real-estate", 16_680_000)],
    );
    // 300,000 + 16,680,000/83.4 (= 200,000) - 50,000 - 4,170,000/83.4 (= 50,000)
    expect(result.netWorthUsd[0]).toBeCloseTo(400_000, 6);
  });
});

describe("PR-08 Payoff month matches the annuity formula", () => {
  it("PR-08 $200,000 at 6% with $2,000 a month pays off in month 139", () => {
    const [l] = run([liability(200_000, 0.06, 2_000)], { horizonYears: 20 }).liabilities;
    expect(Math.ceil(-Math.log(1 - (200_000 * 0.005) / 2_000) / Math.log(1.005))).toBe(139);
    expect(l.payoffMonth).toBe(139);
    expect(l.native[138]).toBeGreaterThan(0);
    expect(l.native.slice(139).every((b) => b === 0)).toBe(true);
    expect(l.usd.slice(139).every((b) => b === 0)).toBe(true);
  });
});

describe("PR-09 A Liability at zero balance is already paid off", () => {
  it("PR-09 payoff month 0, no interest, balance 0 throughout", () => {
    const [l] = run([liability(0, 0.06, 500)]).liabilities;
    expect(l.payoffMonth).toBe(0);
    expect(l.interestRemaining).toBe(0);
    expect(l.notOnTrack).toBe(false);
    expect(l.native.every((b) => b === 0)).toBe(true);
  });
});

describe("PR-10 Raising a Monthly payment raises projected Net Worth", () => {
  it("PR-10 strictly higher from month 1 until the earlier payoff; month 0 unchanged", () => {
    const holdings = [holding("US", "stocks", 100_000)];
    const low = run([liability(200_000, 0.06, 2_000)], {}, holdings);
    const high = run([liability(200_000, 0.06, 2_500)], {}, holdings);
    const earlier = Math.min(low.liabilities[0].payoffMonth!, high.liabilities[0].payoffMonth!);
    expect(high.netWorthUsd[0]).toBe(low.netWorthUsd[0]);
    for (let k = 1; k <= Math.min(earlier, 120); k++) {
      expect(high.netWorthUsd[k]).toBeGreaterThan(low.netWorthUsd[k]);
    }
  });
});

describe("PR-11 Interest remaining equals total paid minus today's balance", () => {
  it("PR-11 matches an independent payment schedule within $0.01", () => {
    const [l] = run([liability(200_000, 0.06, 2_000)], { horizonYears: 20 }).liabilities;
    // Every payment is $2,000 except the last, which pays only what is left.
    let b = 200_000;
    let paid = 0;
    while (b > 0) {
      const owed = b * 1.005;
      const pay = Math.min(2_000, owed);
      paid += pay;
      b = owed - pay;
    }
    expect(l.interestRemaining).toBeCloseTo(paid - 200_000, 2);
    expect(l.interestRemaining).toBeGreaterThan(0);
  });
});

describe("PR-12 Payoff after the horizon is still reported", () => {
  it("PR-12 month 139 reported while the series stops at month 60", () => {
    const [l] = run([liability(200_000, 0.06, 2_000)], { horizonYears: 5 }).liabilities;
    expect(l.payoffMonth).toBe(139);
    expect(l.native).toHaveLength(61);
    expect(l.native[60]).toBeGreaterThan(0);
    const full = run([liability(200_000, 0.06, 2_000)], { horizonYears: 20 }).liabilities[0];
    expect(l.interestRemaining).toBeCloseTo(full.interestRemaining!, 6);
  });
});

describe("PR-13 Not on track depends on the payment versus the interest", () => {
  it.each([
    [900, true],
    [1000, true],
    [1001, true],
    [1100, false],
  ])("PR-13 payment %i gives Not on track %s", (payment, flag) => {
    const [l] = run([liability(120_000, 0.1, payment)]).liabilities;
    expect(l.notOnTrack).toBe(flag);
  });

  it("PR-13 a payment of 1,100 pays off in month 289", () => {
    expect(run([liability(120_000, 0.1, 1_100)]).liabilities[0].payoffMonth).toBe(289);
  });
});

describe("PR-14 A Not on track Liability grows and has no payoff", () => {
  it("PR-14 balance 120,100 at month 1 and rising; no payoff or interest remaining", () => {
    const [l] = run([liability(120_000, 0.1, 900)]).liabilities;
    expect(l.native[1]).toBeCloseTo(120_100, 6);
    for (let k = 1; k < l.native.length; k++) expect(l.native[k]).toBeGreaterThan(l.native[k - 1]);
    expect(l.payoffMonth).toBeUndefined();
    expect(l.interestRemaining).toBeUndefined();
  });
});
