import { describe, expect, it } from "vitest";
import { equity, equitySeries, equityBuilt, percentOwned } from "@/lib/calc";

describe("equity", () => {
  it("EQ-01 Equity of a financed property", () => {
    expect(equity(500000, 320000)).toBe(180000);
  });

  it("EQ-02 An India pair converts to USD at the FX Rate", () => {
    const fx = 83.4;
    expect(equity(16680000 / fx, 8340000 / fx)).toBeCloseTo(100000, 6);
  });

  it("EQ-03 Equity follows a projected series point by point", () => {
    const values = [500000, 510000, 520000, 530000];
    const balances = [320000, 200000, 0, 0];
    expect(equitySeries(values, balances)).toEqual([180000, 310000, 520000, 530000]);
  });

  it.each([
    [500000, 320000, 0.36],
    [500000, 0, 1],
    [300000, 350000, 0],
    [0, 10000, 0],
  ])("EQ-04 % owned is clamped (value %d, balance %d)", (value, balance, owned) => {
    expect(percentOwned(value, balance)).toBeCloseTo(owned, 10);
  });

  it("EQ-05 Equity built across two financed assets", () => {
    expect(equityBuilt([180000, -5000])).toBe(175000);
  });

  it("EQ-06 No links means no Equity built", () => {
    expect(equityBuilt([])).toBe(0);
  });
});
