import { describe, expect, it } from "vitest";
import { buildOverview } from "@/lib/views/overview";
import { goalRows } from "@/lib/views/goals";
import type { PortfolioData } from "@/lib/read-model/types";
import { holding, portfolio } from "../fixtures/portfolio";

const TODAY = "2026-10-15";

type G = { name?: string | null; targetUsd: number };

// Growth is pinned to 0% and Monthly savings are 8,000, so Net Worth rises $8K a month.
function data(goals: G[], current = 200_000): PortfolioData {
  const flat = { inflation: 0, realestate: 0, stocks: 0, cash: 0 };
  return portfolio({
    today: TODAY,
    holdings: [
      holding({
        id: "cash",
        assetClass: "cash",
        currentValue: current,
        valuations: [
          { date: "2025-01-31", value: 100_000, source: "user" },
          { date: "2026-10-01", value: current, source: "user" },
        ],
      }),
    ],
    assumptions: {
      horizonYears: null,
      savingsGrowth: 0,
      shared: { crypto: 0, metals: 0, other: 0 },
      byCountry: {
        US: { ...flat, monthlySavings: 8_000 },
        IN: { ...flat, monthlySavings: null },
      },
    },
    goals: goals.map((g, i) => ({ id: `g${i}`, name: g.name ?? null, targetUsd: g.targetUsd })),
  });
}

describe("goals on the overview view", () => {
  it.each(["1Y", "All"] as const)("GO-04 the %s range never changes a Goal's status", (range) => {
    // $150K was crossed in the history, $400K only in the Projection.
    const d = data([{ targetUsd: 150_000 }, { targetUsd: 400_000 }], 200_000);
    const card = buildOverview(d, { range }).goals;
    const page = goalRows(d);
    expect(card).not.toBeNull();
    const row400 = card!.rows.find((r) => r.target === 400_000)!;
    expect(row400.status).toEqual(page.find((r) => r.target === 400_000)!.status);
    expect(row400.status.kind).toBe("projected");
  });

  it("GO-13 the card lists the next three unreached Goals in order, with All goals", () => {
    const d = data(
      [100_000, 150_000, 250_000, 500_000, 1_000_000, 2_000_000].map((targetUsd) => ({ targetUsd })),
    );
    const goals = buildOverview(d, { range: "All" }).goals!;
    expect(goals.rows.map((r) => r.target)).toEqual([250_000, 500_000, 1_000_000]);
    for (const r of goals.rows) {
      expect(r.name).toBeTruthy();
      expect(r.status.label).toBeTruthy();
    }
    expect(goals.allHref).toBe("/goals");
  });

  it.each([
    ["no Goals", []],
    ["only Reached Goals", [{ targetUsd: 100_000 }, { targetUsd: 150_000 }]],
  ] as [string, G[]][])("GO-14 no Goals card with %s", (_label, goals) => {
    expect(buildOverview(data(goals), { range: "All" }).goals).toBeNull();
  });

  it("GO-15 every Goal becomes a goal line with its displayed name", () => {
    const d = data([{ name: "Quarter million", targetUsd: 250_000 }, { targetUsd: 500_000 }]);
    expect(buildOverview(d, { range: "All" }).chart!.goals).toEqual([
      { value: 250_000, label: "Quarter million" },
      { value: 500_000, label: "$500K net worth" },
    ]);
  });
});
