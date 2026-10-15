import { describe, expect, it } from "vitest";
import { equity, equitySeries, equityBuilt, percentOwned } from "@/lib/calc";

describe("EQ-01 Equity of a financed property", () => {
  it("EQ-01 $500,000 value less $320,000 balance", () => {
    expect(equity(500_000, 320_000)).toBe(180_000);
  });
});

describe("EQ-02 An India pair converts to USD at the FX Rate", () => {
  it("EQ-02 ₹16,680,000 less ₹8,340,000 at 83.4", () => {
    const equityUsd = equity(
      { native: 16_680_000, fxRate: 83.4 },
      { native: 8_340_000, fxRate: 83.4 },
    );
    expect(equityUsd).toBeCloseTo(100_000, 6);
  });
});

describe("EQ-03 Equity follows a projected series point by point", () => {
  it("EQ-03 each month is value minus balance, and equals the value after payoff", () => {
    const value = [100, 110, 120, 130];
    const balance = [60, 30, 0, 0];
    expect(equitySeries(value, balance)).toEqual([40, 80, 120, 130]);
  });
});

describe("EQ-04 % owned is clamped", () => {
  it.each([
    [500_000, 320_000, 0.36],
    [500_000, 0, 1],
    [300_000, 350_000, 0],
    [0, 10_000, 0],
  ])("EQ-04 value %i balance %i owned %d", (value, balance, owned) => {
    expect(percentOwned(value, balance)).toBeCloseTo(owned, 10);
  });
});

describe("EQ-05 Equity built across two financed assets", () => {
  it("EQ-05 $180,000 and -$5,000 give $175,000", () => {
    const pairs = [
      { value: 500_000, balance: 320_000 },
      { value: 295_000, balance: 300_000 },
    ];
    expect(equityBuilt(pairs)).toBe(175_000);
  });
});

describe("EQ-06 No links means no Equity built", () => {
  it("EQ-06 no pairs gives 0", () => {
    expect(equityBuilt([])).toBe(0);
  });
});
