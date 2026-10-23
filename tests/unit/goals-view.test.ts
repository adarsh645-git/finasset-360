import { describe, expect, it } from "vitest";
import { buildGoalsPage, goalRows } from "@/lib/views/goals";
import type { PortfolioData } from "@/lib/read-model/types";
import { holding, liability, portfolio } from "../fixtures/portfolio";

const TODAY = "2026-10-15";

type Setup = {
  /** Valuations of one US cash Holding, and its current value. */
  valuations?: { date: string; value: number }[];
  current?: number;
  owed?: number;
  savings?: number | null;
  horizon?: number | null;
  goals: { id?: string; name?: string | null; targetUsd: number }[];
  rate?: number;
};

// Cash and Stocks growth are pinned to 0%, so only Monthly savings move Net Worth.
function data(s: Setup): PortfolioData {
  const flat = { inflation: 0, realestate: 0, stocks: 0, cash: s.rate ?? 0 };
  return portfolio({
    today: TODAY,
    holdings:
      s.current === undefined
        ? []
        : [
            holding({
              id: "cash",
              assetClass: "cash",
              currentValue: s.current,
              valuations: (s.valuations ?? []).map((v) => ({ ...v })) as never,
            }),
          ],
    liabilities: s.owed ? [liability({ currentBalance: s.owed, apr: 0 })] : [],
    assumptions: {
      horizonYears: s.horizon ?? null,
      savingsGrowth: 0,
      shared: { crypto: 0, metals: 0, other: 0 },
      byCountry: {
        US: { ...flat, monthlySavings: s.savings ?? null },
        IN: { ...flat, monthlySavings: null },
      },
    },
    goals: s.goals.map((g, i) => ({ id: g.id ?? `g${i}`, name: g.name ?? null, targetUsd: g.targetUsd })),
  });
}

const one = (s: Setup) => goalRows(data(s))[0]!;

describe("goals view", () => {
  it("GO-01 cards are sorted by target ascending", () => {
    // The read model hands Goals over sorted by target; the page keeps that order.
    const sorted = [
      { name: "$100K net worth", targetUsd: 100_000 },
      { name: "Quarter million", targetUsd: 250_000 },
      { name: "Half a million", targetUsd: 500_000 },
    ];
    const page = buildGoalsPage(data({ current: 1, goals: sorted }));
    expect(page.rows.map((r) => r.name)).toEqual([
      "$100K net worth",
      "Quarter million",
      "Half a million",
    ]);
  });

  it.each([
    ["Mar 2025", { valuations: [{ date: "2025-03-31", value: 150_000 }], current: 150_000 }, "Reached Mar 2025", "positive"],
    [
      "Oct 2026",
      { valuations: [{ date: "2025-01-31", value: 100_000 }], current: 150_000 },
      "Reached Oct 2026",
      "positive",
    ],
    ["May 2027", { current: 100_000, savings: 8_000 }, "Projected May 2027 · in 7 mo", "secondary"],
    ["Apr 2029", { current: 100_000, savings: 1_700 }, "Projected Apr 2029 · in 2.5 yrs", "secondary"],
    ["never", { current: 100_000 }, "Beyond the 10-year projection", "secondary"],
  ] as [string, Partial<Setup>, string, string][])(
    "GO-02 status label and colour when the first month is %s",
    (_month, setup, label, colour) => {
      const row = one({ ...setup, goals: [{ targetUsd: 150_000 }] });
      expect(row.status.label).toBe(label);
      expect(row.status.colour).toBe(colour);
    },
  );

  it.each([
    [null, "Beyond the 10-year projection"],
    [15, "Beyond the 15-year projection"],
  ])("GO-03 'Beyond' names a horizon of %s", (horizon, label) => {
    expect(one({ current: 100_000, horizon, goals: [{ targetUsd: 150_000 }] }).status.label).toBe(label);
  });

  it("GO-05 Monthly savings bring the Projected month forward", () => {
    const base = { current: 100_000, valuations: [], horizon: 20, goals: [{ targetUsd: 200_000 }] };
    const without = one({ ...base, rate: 4 });
    const withSavings = one({ ...base, rate: 4, savings: 3_000 });
    const month = (label: string) => {
      const [, mon, year] = label.match(/Projected (\w+) (\d+)/)!;
      return Number(year) * 12 + ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(mon);
    };
    expect(without.status.kind).toBe("projected");
    expect(withSavings.status.kind).toBe("projected");
    expect(month(withSavings.status.label)).toBeLessThan(month(without.status.label));
  });

  it.each([
    [140_000, "$140K of $150K", 93, "ink"],
    [150_000, "$150K of $150K", 100, "positive"],
    [400_000, "$400K of $150K", 100, "positive"],
    [-20_000, "−$20K of $150K", 0, "ink"],
  ])("GO-06 progress text and bar at net worth %s", (netWorth, text, bar, colour) => {
    const setup: Setup =
      netWorth < 0
        ? { owed: -netWorth, goals: [{ targetUsd: 150_000 }] }
        : { current: netWorth, goals: [{ targetUsd: 150_000 }] };
    const row = one(setup);
    expect(row.progressText).toBe(text);
    expect(row.barPercent).toBe(bar);
    expect(row.barColour).toBe(colour);
  });

  it("GO-07 a Reached Goal after a dip keeps its status but not a full bar", () => {
    const row = one({
      valuations: [{ date: "2025-03-31", value: 150_000 }],
      current: 140_000,
      goals: [{ targetUsd: 150_000 }],
    });
    expect(row.status.label).toBe("Reached Mar 2025");
    expect(row.status.colour).toBe("positive");
    expect(row.barPercent).toBe(93);
    expect(row.barColour).toBe("ink");
  });

  it.each([
    ["no Goals", []],
    ["two Goals", [{ targetUsd: 1 }, { targetUsd: 2 }]],
  ])("GO-08 heading and subtitle with %s", (_label, goals) => {
    const page = buildGoalsPage(data({ current: 1, goals }));
    expect(page.heading).toBe("Net worth milestones");
    expect(page.subtitle).toBe(
      "Projected dates use the country-specific growth rates set on the Growth page, current loan payments and your monthly savings. Amounts are nominal.",
    );
  });
});
