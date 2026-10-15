import { describe, expect, it } from "vitest";
import { checkStaleness, oldestHandPriceDate } from "@/lib/calc";

const TODAY = "2026-09-12";

function daysBefore(days: number): string {
  return new Date(Date.UTC(2026, 8, 12 - days)).toISOString().slice(0, 10);
}

describe("staleness", () => {
  it.each([
    [0, false],
    [30, false],
    [31, true],
    [47, true],
  ])("ST-01 a figure %i days old gives Stale=%s", (days, stale) => {
    expect(checkStaleness(daysBefore(days), TODAY)).toEqual({ ageDays: days, stale });
  });

  it("ST-02 A Liability is judged by its latest balance", () => {
    expect(checkStaleness(daysBefore(45), TODAY)).toEqual({ ageDays: 45, stale: true });
  });

  it("ST-03 A Stocks Holding is judged by its oldest Hand Price, not the automatic Valuation", () => {
    const positions = [
      { handPriceDate: daysBefore(10) },
      { handPriceDate: daysBefore(47) },
      { handPriceDate: null },
    ];
    expect(checkStaleness(oldestHandPriceDate(positions), TODAY)).toEqual({
      ageDays: 47,
      stale: true,
    });
    // The automatic Valuation recorded today would read fresh if it were passed.
    expect(checkStaleness(daysBefore(0), TODAY).stale).toBe(false);
  });

  it("ST-04 Listed US tickers never go Stale", () => {
    const positions = [{ handPriceDate: null }, { handPriceDate: null }];
    expect(oldestHandPriceDate(positions)).toBeNull();
    // The 90-day-old last Valuation is never passed: nothing user-entered.
    expect(checkStaleness(oldestHandPriceDate(positions), TODAY)).toEqual({
      ageDays: null,
      stale: false,
    });
  });

  it("ST-05 A brand-new item is fresh", () => {
    expect(checkStaleness(daysBefore(0), TODAY)).toEqual({ ageDays: 0, stale: false });
  });
});
