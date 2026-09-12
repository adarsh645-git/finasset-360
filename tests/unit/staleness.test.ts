import { describe, expect, it } from "vitest";
import { daysAgoLabel, daysSince, isStale } from "@/lib/valuations/staleness";

describe("daysSince", () => {
  it("is 0 for a Valuation recorded today", () => {
    expect(daysSince("2026-09-12", new Date("2026-09-12T18:00:00Z"))).toBe(0);
  });

  it("counts whole calendar days regardless of time-of-day", () => {
    expect(daysSince("2026-08-01", new Date("2026-09-12T00:00:00Z"))).toBe(42);
    expect(daysSince("2026-08-01", new Date("2026-09-12T23:59:00Z"))).toBe(42);
  });
});

describe("isStale", () => {
  it("is false at exactly 30 days", () => {
    expect(isStale("2026-08-13", new Date("2026-09-12T00:00:00Z"))).toBe(false);
  });

  it("is true past 30 days", () => {
    expect(isStale("2026-08-12", new Date("2026-09-12T00:00:00Z"))).toBe(true);
  });

  it("is false for a Valuation recorded today", () => {
    expect(isStale("2026-09-12", new Date("2026-09-12T00:00:00Z"))).toBe(false);
  });
});

describe("daysAgoLabel", () => {
  it("says 'today' at 0 days", () => {
    expect(daysAgoLabel("2026-09-12", new Date("2026-09-12T00:00:00Z"))).toBe("today");
  });

  it("uses the singular at 1 day", () => {
    expect(daysAgoLabel("2026-09-11", new Date("2026-09-12T00:00:00Z"))).toBe("1 day ago");
  });

  it("uses the plural beyond 1 day", () => {
    expect(daysAgoLabel("2026-08-01", new Date("2026-09-12T00:00:00Z"))).toBe("42 days ago");
  });
});
