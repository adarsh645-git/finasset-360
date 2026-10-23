import { describe, expect, it } from "vitest";
import { layoutChart, tooltipAt } from "@/lib/chart";
import { buildOverview, parseRange } from "@/lib/views/overview";
import { holding, liability, portfolio } from "../fixtures/portfolio";

const TODAY = "2026-10-13";

describe("overview header", () => {
  it("OV-01 a range's change is measured from today minus the range", () => {
    const data = portfolio({
      today: TODAY,
      holdings: [
        holding({
          currentValue: 1_180_000,
          valuations: [
            { date: "2020-01-01", value: 500_000, source: "user" },
            { date: "2025-10-13", value: 1_000_000, source: "user" },
          ],
        }),
      ],
    });
    const { header } = buildOverview(data, { range: "1Y" });

    expect(header.total).toBe("$1,180,000");
    expect(header.change).toBe("+$180,000 (+18.0%)");
    expect(header.since).toBe("since Oct 2025");
  });

  it("OV-02 a range longer than the history starts at the first Valuation", () => {
    const data = portfolio({
      today: TODAY,
      holdings: [
        holding({
          currentValue: 42_000,
          valuations: [{ date: "2026-08-20", value: 40_000, source: "user" }],
        }),
      ],
    });
    const { header } = buildOverview(data, { range: "All" });

    expect(header.change).toBe("+$2,000 (+5.0%)");
    expect(header.since).toBe("since Aug 2026");
    expect(buildOverview(data, { range: "5Y" }).header.since).toBe("since Aug 2026");
  });

  it("OV-03 a start at or below zero shows the amount with no percent", () => {
    const data = portfolio({
      today: TODAY,
      holdings: [
        holding({
          currentValue: 15_000,
          valuations: [{ date: "2025-10-13", value: 0, source: "user" }],
        }),
      ],
      liabilities: [
        liability({
          currentBalance: 0,
          valuations: [{ date: "2025-10-13", value: 5_000, source: "user" }],
        }),
      ],
    });
    const { header } = buildOverview(data, { range: "1Y" });

    expect(header.change).toBe("+$20,000");
    expect(header.tone).toBe("up");
  });
});

describe("overview range", () => {
  it.each([
    [undefined, "All"],
    ["1Y", "1Y"],
    ["5Y", "5Y"],
    ["2W", "All"],
  ])("OV-04 an address range of %s selects %s", (param, range) => {
    expect(parseRange(param)).toBe(range);
    const overview = buildOverview(portfolio({ holdings: [holding({ currentValue: 1 })] }), {
      range: parseRange(param),
    });
    expect(overview.ranges.filter((r) => r.selected).map((r) => r.label)).toEqual([range]);
    expect(overview.ranges.map((r) => r.href)).toEqual([
      "/?range=1Y",
      "/?range=3Y",
      "/?range=5Y",
      "/?range=All",
    ]);
  });
});

describe("overview chart", () => {
  const data = portfolio({
    today: TODAY,
    assumptions: { ...portfolio().assumptions, horizonYears: 10 },
    holdings: [
      holding({
        currentValue: 90_000,
        valuations: [
          { date: "2024-01-15", value: 50_000, source: "user" },
          { date: "2025-06-15", value: 70_000, source: "user" },
        ],
      }),
    ],
    liabilities: [
      liability({
        currentBalance: 10_000,
        monthlyPayment: 500,
        valuations: [{ date: "2024-01-15", value: 20_000, source: "user" }],
      }),
    ],
  });

  it.each([
    [true, "2036-10-13"],
    [false, TODAY],
  ])("OV-05 with the projection %s the chart runs from the first point to %s", (projection, end) => {
    const { chart } = buildOverview(data, { range: "All" });
    const layout = layoutChart({ ...chart!, projection });

    expect(layout.dates[0]).toBe("2024-01-15");
    expect(layout.dates.at(-1)).toBe(end);
    expect(tooltipAt(layout, 0).rows.map((r) => r.name)).toEqual(["Net worth", "Assets", "Liabilities"]);
    const [net, assets, liabilities] = chart!.series;
    expect([net!.line, assets!.line, liabilities!.line]).toEqual([undefined, false, false]);
    expect([assets!.scaled, liabilities!.scaled]).toEqual([false, false]);
    expect(chart!.goals).toEqual([]);
  });
});

describe("first run", () => {
  it("OV-21 with no current items only the $0 header comes back", () => {
    const overview = buildOverview(portfolio({ today: TODAY }), { range: "All" });

    expect(overview.firstRun).toBe(true);
    expect(overview.header).toMatchObject({ label: "Net worth · rolled up to USD", total: "$0", change: null });
    expect(overview.chart).toBeNull();
  });

  it("OV-22 a Portfolio with only archived items is still first run", () => {
    const overview = buildOverview(
      portfolio({
        today: TODAY,
        holdings: [
          holding({
            currentValue: 5_000,
            archivedAt: "2026-09-01T00:00:00Z",
            valuations: [{ date: "2026-01-01", value: 5_000, source: "user" }],
          }),
        ],
      }),
      { range: "All" },
    );

    expect(overview.firstRun).toBe(true);
    expect(overview.header.total).toBe("$0");
  });
});
