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

const at = (s: { points: { date: string; value: number }[] }, date: string) =>
  s.points.find((p) => p.date === date)!.value;
const tipAt = (
  s: { tip?: { date: string; value: number }[]; points: { date: string; value: number }[] },
  date: string,
) => (s.tip ?? s.points).find((p) => p.date === date)!.value;

describe("growth chart modes", () => {
  it.each([
    ["all", ["Real estate", "Cash"], ["Real estate", "Cash", "Owed", "Net worth"]],
    ["us", ["Cash"], ["Cash", "Owed", "Net worth"]],
    ["in", ["Real estate"], ["Real estate", "Owed", "Net worth"]],
  ])("GR-06 By asset class, scope %s stacks %j and the legend reads %j", (scope, layers, legend) => {
    const { chart } = buildGrowth(twoCountry(), view({ range: "1Y", scope, mode: "class" }));
    const names = chart!.series.map((s) => s.name);

    expect(names).toEqual([...layers, "Owed", "Net worth"]);
    expect(chart!.legend.map((l) => l.name)).toEqual(legend);
    expect(chart!.series.find((s) => s.name === "Net worth")!.bold).toBe(true);
    expect(chart!.series.filter((s) => s.endLabel).map((s) => s.name)).toEqual(["Owed", "Net worth"]);
  });

  it("GR-06 each layer's tip is its own class's value, not the stacked total", () => {
    const { chart } = buildGrowth(twoCountry(), view({ range: "1Y", mode: "class" }));
    const [realEstate, cash] = chart!.series;

    expect(Math.round(tipAt(realEstate!, TODAY))).toBe(110_000);
    expect(Math.round(tipAt(cash!, TODAY))).toBe(100_000);
    expect(Math.round(at(cash!, TODAY))).toBe(210_000);
    expect(cash!.base).toEqual(realEstate!.points);
  });

  it("GR-07 Monthly savings add a Stocks layer even with no Stocks Holding", () => {
    const base = portfolio();
    const data = portfolio({
      today: TODAY,
      holdings: [holding({ assetClass: "cash", currentValue: 5_000, valuations: [val("2026-01-01", 5_000)] })],
      assumptions: {
        ...base.assumptions,
        byCountry: {
          ...base.assumptions.byCountry,
          US: { ...base.assumptions.byCountry.US, monthlySavings: 1_000 },
        },
      },
    });
    const { chart } = buildGrowth(data, view({ mode: "class" }));
    const stocks = chart!.series.find((s) => s.name === "Stocks")!;

    expect(stocks).toBeDefined();
    const projected = stocks.tip!.filter((p) => p.date > TODAY);
    expect(stocks.tip!.filter((p) => p.date <= TODAY).every((p) => p.value === 0)).toBe(true);
    expect(projected[0]!.value).toBeCloseTo(1_000, 6);
    expect(projected.at(-1)!.value).toBeGreaterThan(100_000);
  });

  it.each([
    ["all", ["Total net worth", "US net worth", "India net worth"], [151_000, 55_000, 96_000]],
    ["in", ["India net worth"], [96_000]],
  ])("GR-08 By country, scope %s draws %j", (scope, lines, values) => {
    const { chart } = buildGrowth(twoCountry(), view({ range: "1Y", scope, mode: "country" }));

    expect(chart!.series.map((s) => s.name)).toEqual(lines);
    expect(chart!.legend.map((l) => l.name)).toEqual(lines);
    expect(chart!.series.map((s) => Math.round(at(s, TODAY)))).toEqual(values);
    expect(chart!.series.every((s) => s.endLabel)).toBe(true);
    if (scope === "all") {
      expect(chart!.series.map((s) => s.endName)).toEqual(["Total", "US", "India"]);
      expect(chart!.series[0]!.bold).toBe(true);
    } else {
      expect(chart!.series[0]!.endName).toBe("India");
    }
  });

  it("GR-09 Today's dollars restates the past upward", () => {
    const data = portfolio({
      today: TODAY,
      holdings: [
        holding({ assetClass: "cash", currentValue: 100_000, valuations: [val("2024-10-13", 100_000)] }),
      ],
    });
    const { chart } = buildGrowth(data, view({ basis: "today" }));
    const net = chart!.series[0]!;

    expect(net.points[0]!.date).toBe("2024-10-13");
    expect(net.points[0]!.value).toBeCloseTo(106_090, 4);
    expect(at(net, TODAY)).toBeCloseTo(100_000, 6);
  });

  it("GR-09 the header stays nominal when the basis is Today's dollars", () => {
    const { header } = buildGrowth(twoCountry(), view({ range: "1Y", basis: "today" }));
    expect(header!.change).toBe("+$41,000");
  });

  it.each([
    ["nominal", "all", "What you own, what you owe", "Nominal dollars, not adjusted for inflation"],
    ["nominal", "in", "What you own, what you owe · India", "Nominal dollars, not adjusted for inflation"],
    [
      "today",
      "all",
      "In today's dollars",
      "Each country restated in Oct 2026 dollars at its own inflation: US 2.5%, India 5.0%",
    ],
    [
      "today",
      "us",
      "In today's dollars · United States",
      "Each country restated in Oct 2026 dollars at its own inflation: US 2.5%",
    ],
  ])("GR-10 basis %s, scope %s titles the chart %s", (basis, scope, title, subtitle) => {
    const base = portfolio();
    const data = twoCountry();
    data.assumptions = {
      ...base.assumptions,
      byCountry: {
        ...base.assumptions.byCountry,
        US: { ...base.assumptions.byCountry.US, inflation: 2.5 },
      },
    };
    const { chart } = buildGrowth(data, view({ basis, scope }));

    expect(chart!.title).toBe(title);
    expect(chart!.subtitle).toBe(subtitle);
  });

  it("GR-06/GR-09 mode and basis controls keep the rest of the view state", () => {
    const g = buildGrowth(twoCountry(), view({ range: "3Y", mode: "class" }));

    expect(g.modes.map((m) => [m.label, m.selected])).toEqual([
      ["Simple", false],
      ["By asset class", true],
      ["By country", false],
    ]);
    expect(g.modes[2]!.href).toBe("/growth?range=3Y&mode=country");
    expect(g.bases.map((b) => [b.label, b.selected])).toEqual([
      ["Nominal", true],
      ["Today's dollars", false],
    ]);
    expect(g.bases[1]!.href).toBe("/growth?range=3Y&mode=class&basis=today");
  });
});
