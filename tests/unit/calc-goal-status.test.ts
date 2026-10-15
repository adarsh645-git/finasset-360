import { describe, expect, it } from "vitest";
import { goalStatus } from "@/lib/calc";

// Today is Oct 2026. The series runs monthly from Jan 2025 to Dec 2036.
const TODAY_INDEX = 21; // Oct 2026
const monthAt = (i: number) => {
  const d = new Date(Date.UTC(2025, i, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
const indexOf = (month: string) => {
  for (let i = 0; i < 144; i++) if (monthAt(i) === month) return i;
  throw new Error(`month outside series: ${month}`);
};
const build = (value: (i: number) => number) =>
  Array.from({ length: 144 }, (_, i) => ({ month: monthAt(i), netWorth: value(i) }));
const input = (series: ReturnType<typeof build>, target: number) => ({
  series,
  todayIndex: TODAY_INDEX,
  target,
  horizonYears: 10,
});

describe("GS-01 Status from where the target is first reached", () => {
  it.each([
    ["2025-03", { status: "reached", month: "2025-03", monthsFromToday: -19 }],
    ["2026-10", { status: "reached", month: "2026-10", monthsFromToday: 0 }],
    ["2029-04", { status: "projected", month: "2029-04", monthsFromToday: 30 }],
  ])("GS-01 first reached %s", (first, expected) => {
    const at = indexOf(first);
    const series = build((i) => (i >= at ? 150_000 : 1_000));
    expect(goalStatus(input(series, 150_000))).toMatchObject(expected);
  });

  it("GS-01 never reached is Beyond the 10-year projection", () => {
    const result = goalStatus(input(build(() => 1_000), 150_000));
    expect(result).toMatchObject({ status: "beyond", horizonYears: 10 });
    expect(result.month).toBeUndefined();
  });
});

describe("GS-02 A target equal to today's Net Worth is reached today", () => {
  it("GS-02 only today is at the target", () => {
    const series = build((i) => (i === TODAY_INDEX ? 250_000 : 100_000));
    expect(goalStatus(input(series, 250_000))).toMatchObject({
      status: "reached",
      month: "2026-10",
      monthsFromToday: 0,
    });
  });
});

describe("GS-03 Reached sticks after a dip", () => {
  it("GS-03 reached Mar 2025, $140,000 today", () => {
    const march = indexOf("2025-03");
    const series = build((i) => (i === march ? 150_000 : i <= TODAY_INDEX ? 140_000 : 100_000));
    expect(goalStatus(input(series, 150_000))).toMatchObject({
      status: "reached",
      month: "2025-03",
    });
  });
});

describe("GS-04 Progress is clamped", () => {
  it.each([
    [140_000, 0.9333],
    [150_000, 1],
    [400_000, 1],
    [-20_000, 0],
  ])("GS-04 net worth %i", (netWorth, progress) => {
    const series = build((i) => (i === TODAY_INDEX ? netWorth : -1_000_000));
    expect(goalStatus(input(series, 150_000)).progress).toBeCloseTo(progress, 4);
  });
});

describe("GS-05 Negative Net Worth projected to cross the target", () => {
  it("GS-05 -$20,000 today, $50,000 in Jan 2031", () => {
    const at = indexOf("2031-01");
    const series = build((i) => (i >= at ? 50_000 : -20_000));
    const result = goalStatus(input(series, 50_000));
    expect(result).toMatchObject({ status: "projected", month: "2031-01" });
    expect(result.progress).toBe(0);
  });
});
