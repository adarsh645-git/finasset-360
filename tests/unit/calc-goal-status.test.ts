import { describe, expect, it } from "vitest";
import { deriveGoalStatus, type NetWorthPoint } from "@/lib/calc";

// Monthly series from Jan 2025 to Dec 2036; today is Oct 2026 (index 21).
const TODAY_INDEX = 21;
const LENGTH = 144;

function monthLabel(index: number): string {
  const year = 2025 + Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** Flat at `base`, then `from` onwards at `level` when a month is given. */
function series(base: number, step?: { from: string; level: number }): NetWorthPoint[] {
  return Array.from({ length: LENGTH }, (_, i) => {
    const month = monthLabel(i);
    const stepped = step !== undefined && month >= step.from;
    return { month, netWorth: stepped ? step.level : base };
  });
}

describe("goal status", () => {
  it.each([
    ["2025-03", { status: "reached", month: "2025-03" }],
    ["2026-10", { status: "reached", month: "2026-10" }],
    ["2029-04", { status: "projected", month: "2029-04", monthsFromToday: 30 }],
  ])("GS-01 first reached in %s", (first, expected) => {
    const points = series(100_000, { from: first, level: 150_000 });
    expect(deriveGoalStatus(points, TODAY_INDEX, 150_000, 10)).toMatchObject(expected);
  });

  it("GS-01 never reached is Beyond the horizon", () => {
    expect(deriveGoalStatus(series(100_000), TODAY_INDEX, 150_000, 10)).toMatchObject({
      status: "beyond",
      horizonYears: 10,
    });
  });

  it("GS-02 a target equal to today's Net Worth is reached today", () => {
    const points = series(200_000);
    points[TODAY_INDEX] = { month: "2026-10", netWorth: 250_000 };
    expect(deriveGoalStatus(points, TODAY_INDEX, 250_000, 10)).toMatchObject({
      status: "reached",
      month: "2026-10",
    });
  });

  it("GS-03 Reached sticks after a dip", () => {
    const points = series(140_000);
    points[2] = { month: "2025-03", netWorth: 150_000 };
    expect(deriveGoalStatus(points, TODAY_INDEX, 150_000, 10)).toMatchObject({
      status: "reached",
      month: "2025-03",
    });
  });

  it.each([
    [140_000, 0.9333],
    [150_000, 1],
    [400_000, 1],
    [-20_000, 0],
  ])("GS-04 net worth %i gives progress %f", (netWorth, progress) => {
    const result = deriveGoalStatus(series(netWorth), TODAY_INDEX, 150_000, 10);
    expect(result.progress).toBeCloseTo(progress, 4);
  });

  it("GS-05 negative Net Worth projected to cross the target", () => {
    const points = series(-20_000, { from: "2031-01", level: 50_000 });
    expect(deriveGoalStatus(points, TODAY_INDEX, 50_000, 10)).toMatchObject({
      status: "projected",
      month: "2031-01",
      progress: 0,
    });
  });
});
