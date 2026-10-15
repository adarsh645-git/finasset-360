import { describe, expect, it } from "vitest";
import { staleness } from "@/lib/calc";

const today = new Date("2026-09-12T15:00:00Z");
const daysBefore = (n: number) => new Date(Date.UTC(2026, 8, 12 - n)).toISOString().slice(0, 10);

describe("ST-01 The 30-day boundary", () => {
  it.each([
    [0, false],
    [30, false],
    [31, true],
    [47, true],
  ])("ST-01 %i days old, stale %s", (days, stale) => {
    const result = staleness(
      { kind: "manual", valuations: [{ date: daysBefore(days), source: "user" }] },
      today,
    );
    expect(result).toEqual({ ageDays: days, stale });
  });
});

describe("ST-02 A Liability is judged by its latest balance", () => {
  it("ST-02 latest user Valuation 45 days ago", () => {
    const result = staleness(
      {
        kind: "manual",
        valuations: [
          { date: daysBefore(200), source: "user" },
          { date: daysBefore(45), source: "user" },
        ],
      },
      today,
    );
    expect(result).toEqual({ ageDays: 45, stale: true });
  });
});

describe("ST-03 A Stocks Holding is judged by its oldest Hand Price", () => {
  it("ST-03 oldest of 10 and 47 days, ignoring a daily automatic Valuation", () => {
    const result = staleness(
      {
        kind: "stocks",
        positions: [{ handPriceDate: daysBefore(10) }, { handPriceDate: daysBefore(47) }],
      },
      today,
    );
    expect(result).toEqual({ ageDays: 47, stale: true });
  });
});

describe("ST-04 Listed US tickers never go Stale", () => {
  it("ST-04 no Hand-Priced Position means never Stale", () => {
    const result = staleness({ kind: "stocks", positions: [{}, {}] }, today);
    expect(result.stale).toBe(false);
  });
});

describe("ST-05 A brand-new item is fresh", () => {
  it("ST-05 only Valuation recorded today", () => {
    const result = staleness(
      { kind: "manual", valuations: [{ date: daysBefore(0), source: "user" }] },
      today,
    );
    expect(result).toEqual({ ageDays: 0, stale: false });
  });

  it("ST-05 automatic Valuations never count", () => {
    const result = staleness(
      {
        kind: "manual",
        valuations: [
          { date: daysBefore(60), source: "user" },
          { date: daysBefore(0), source: "auto" },
        ],
      },
      today,
    );
    expect(result).toEqual({ ageDays: 60, stale: true });
  });
});
