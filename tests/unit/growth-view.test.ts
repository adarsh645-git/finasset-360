import { describe, expect, it } from "vitest";
import { buildGrowth, parseGrowthView } from "@/lib/views/growth";
import { holding, liability, portfolio } from "../fixtures/portfolio";

const TODAY = "2026-10-13";
const val = (date: string, value: number) => ({ date, value, source: "user" as const });

/** The two-Country Portfolio of GR-02. */
function twoCountry() {
  return portfolio({
    today: TODAY,
    fx: { today: { rate: 85, asOf: TODAY }, history: [{ date: "2025-10-13", rate: 80 }] },
    holdings: [
      holding({
        id: "h-us",
        assetClass: "cash",
        country: "US",
        currentValue: 100_000,
        valuations: [val("2025-10-13", 80_000)],
      }),
      holding({
        id: "h-in",
        assetClass: "realestate",
        country: "IN",
        currency: "INR",
        currentValue: 9_350_000,
        valuations: [val("2025-10-13", 8_000_000)],
      }),
    ],
    liabilities: [
      liability({ id: "l-us", country: "US", currentBalance: 45_000, valuations: [val("2025-10-13", 50_000)] }),
      liability({
        id: "l-in",
        country: "IN",
        currency: "INR",
        currentBalance: 1_190_000,
        valuations: [val("2025-10-13", 1_600_000)],
      }),
    ],
  });
}

const view = (params: Record<string, string>) => parseGrowthView(params);

describe("growth view state", () => {
  it.each([
    [{}, "All", "all", "simple", "nominal"],
    [{ range: "3Y", scope: "in" }, "3Y", "in", "simple", "nominal"],
    [{ mode: "country", basis: "today" }, "All", "all", "country", "today"],
    [{ range: "2Y", scope: "Mars", mode: "pie", basis: "real" }, "All", "all", "simple", "nominal"],
  ])("GR-01 url state %j reads as %s, %s, %s, %s", (params, range, scope, mode, basis) => {
    expect(buildGrowth(twoCountry(), view(params)).view).toEqual({ range, scope, mode, basis });
  });
});

describe("growth header", () => {
  it.each([
    ["all", "+$41,000", "Net worth change since Oct 2025 · all countries · $110,000 → $151,000"],
    ["us", "+$25,000", "Net worth change since Oct 2025 · United States · $30,000 → $55,000"],
    ["in", "+$16,000", "Net worth change since Oct 2025 · India · $80,000 → $96,000"],
  ])("GR-02 scope %s shows %s", (scope, change, line) => {
    const { header } = buildGrowth(twoCountry(), view({ range: "1Y", scope }));
    expect(header).toMatchObject({ change, line, tone: "up" });
  });

  it("GR-03 a range longer than the history starts at the first Valuation", () => {
    const data = portfolio({
      today: TODAY,
      holdings: [holding({ currentValue: 12_000, valuations: [val("2026-03-05", 10_000)] })],
    });
    const growth = buildGrowth(data, view({ range: "5Y" }));

    expect(growth.header!.line).toMatch(/^Net worth change since Mar 2026 · /);
    expect(growth.chart!.series[0]!.points[0]!.date).toBe("2026-03-05");
  });
});

describe("growth chart", () => {
  const history = (horizon: number | null) =>
    portfolio({
      today: TODAY,
      holdings: [holding({ currentValue: 12_000, valuations: [val("2024-01-01", 10_000)] })],
      assumptions: { ...portfolio().assumptions, horizonYears: horizon },
    });

  it.each([
    [10, "2036-10-13"],
    [15, "2041-10-13"],
  ])("GR-04 a %s-year horizon ends the chart at %s with today the last recorded point", (years, end) => {
    const { chart } = buildGrowth(history(years), view({}));
    const points = chart!.series[0]!.points;

    expect(points[0]!.date).toBe("2024-01-01");
    expect(points.at(-1)!.date).toBe(end);
    expect(points.filter((p) => p.date <= TODAY).at(-1)!.date).toBe(TODAY);
  });

  it("GR-05 Simple mode has Net worth, Assets and Owed with end labels, zero axis and a legend", () => {
    const { chart } = buildGrowth(twoCountry(), view({ range: "1Y" }));
    const [net, assets, owed] = chart!.series;
    const now = (s: typeof net) => s!.points.find((p) => p.date === TODAY)!.value;

    expect(chart!.series.map((s) => s.name)).toEqual(["Net worth", "Assets", "Owed"]);
    expect(net!.bold).toBe(true);
    expect([assets!.area, owed!.area]).toEqual([true, true]);
    expect(chart!.series.every((s) => s.endLabel)).toBe(true);
    expect(chart!.zero).toBe(true);
    expect([now(net), now(assets), now(owed)].map(Math.round)).toEqual([151_000, 210_000, 59_000]);
    expect(chart!.legend.map((l) => l.name)).toEqual(["Net worth", "Assets", "Owed"]);
  });
});
