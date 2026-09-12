import { describe, expect, it } from "vitest";
import {
  compareToLastValuation,
  computeLiveEstimate,
  priceAgeLabel,
  type PriceCacheRow,
} from "@/lib/market-data/live-estimate";

function priceCache(overrides: Partial<PriceCacheRow> = {}): PriceCacheRow {
  return {
    symbol: "AAPL",
    price: 150,
    price_currency: "USD",
    source: "finnhub",
    last_error: null,
    fetched_at: "2026-09-12T00:00:00Z",
    ...overrides,
  };
}

describe("computeLiveEstimate", () => {
  it("is quantity times the cached price", () => {
    const estimate = computeLiveEstimate(10, priceCache({ price: 150 }));
    expect(estimate).toMatchObject({ amount: 1500, currency: "USD" });
  });

  it("is null when no cache row exists for the symbol yet", () => {
    expect(computeLiveEstimate(10, null)).toBeNull();
  });

  it("flags a prior fetch failure without hiding the last good price", () => {
    const estimate = computeLiveEstimate(10, priceCache({ last_error: "provider outage" }));
    expect(estimate?.hasRecentFailure).toBe(true);
  });

  it("does not flag a failure when the last fetch succeeded", () => {
    const estimate = computeLiveEstimate(10, priceCache({ last_error: null }));
    expect(estimate?.hasRecentFailure).toBe(false);
  });
});

describe("compareToLastValuation", () => {
  const estimate = computeLiveEstimate(10, priceCache({ price: 150 }))!; // $1500

  it("is the signed amount and percent difference from the last Valuation", () => {
    const diff = compareToLastValuation(estimate, { amount: 1000 }, "USD");
    expect(diff).toEqual({ amount: 500, percent: 50 });
  });

  it("is negative when the Live Estimate is below the last Valuation", () => {
    const diff = compareToLastValuation(estimate, { amount: 2000 }, "USD");
    expect(diff).toEqual({ amount: -500, percent: -25 });
  });

  it("is null when there is no prior Valuation", () => {
    expect(compareToLastValuation(estimate, null, "USD")).toBeNull();
  });

  it("is null when the cached price's currency doesn't match the Holding's — never fabricates an FX rate", () => {
    expect(compareToLastValuation(estimate, { amount: 1000 }, "EUR")).toBeNull();
  });
});

describe("priceAgeLabel", () => {
  it("says 'updated less than an hour ago' just after a fetch", () => {
    const fetchedAt = "2026-09-12T11:30:00Z";
    const now = new Date("2026-09-12T12:00:00Z");
    expect(priceAgeLabel(fetchedAt, now)).toBe("updated less than an hour ago");
  });

  it("counts whole hours within the same day, not just days — a 23-hour-old price must not read as 'today'", () => {
    const fetchedAt = "2026-09-12T00:00:00Z";
    const now = new Date("2026-09-12T23:00:00Z");
    expect(priceAgeLabel(fetchedAt, now)).toBe("updated 23 hours ago");
  });

  it("uses the singular at exactly 1 hour", () => {
    const fetchedAt = "2026-09-12T11:00:00Z";
    const now = new Date("2026-09-12T12:00:00Z");
    expect(priceAgeLabel(fetchedAt, now)).toBe("updated 1 hour ago");
  });

  it("switches to days past 24 hours", () => {
    const fetchedAt = "2026-09-10T12:00:00Z";
    const now = new Date("2026-09-12T13:00:00Z");
    expect(priceAgeLabel(fetchedAt, now)).toBe("updated 2 days ago");
  });

  it("uses the singular at exactly 1 day", () => {
    const fetchedAt = "2026-09-11T12:00:00Z";
    const now = new Date("2026-09-12T13:00:00Z");
    expect(priceAgeLabel(fetchedAt, now)).toBe("updated 1 day ago");
  });
});
