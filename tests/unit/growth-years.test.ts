import { describe, expect, it } from "vitest";
import { buildGrowth, parseGrowthView } from "@/lib/views/growth";
import { holding, liability, portfolio } from "../fixtures/portfolio";

const TODAY = "2026-10-13";
const val = (date: string, value: number) => ({ date, value, source: "user" as const });

function gr14() {
  return {
    today: TODAY,
    holdings: [
      holding({
        id: "h-us",
        country: "US" as const,
        currentValue: 84_000,
        valuations: [val("2024-12-31", 50_000), val("2025-12-31", 70_000)],
      }),
    ],
    liabilities: [
      liability({
        id: "l-us",
        country: "US" as const,
        currentBalance: 10_000,
        valuations: [val("2024-12-31", 20_000), val("2025-12-31", 12_000), val("2026-10-01", 10_000)],
      }),
    ],
  };
}

const rows = (data: ReturnType<typeof portfolio>, params = {}) =>
  buildGrowth(data, parseGrowthView(params)).years!.map((r) => [r.year, r.netWorth, r.debt, r.change]);

describe("growth year by year", () => {
  it("GR-14 year-end rows with the current year starred", () => {
    expect(rows(portfolio(gr14()))).toEqual([
      ["2026*", "$74K", "$10K", "+28%"],
      ["2025", "$58K", "$12K", "+93%"],
      ["2024", "$30K", "$20K", "—"],
    ]);
  });

  it("GR-14 a previous Net Worth of 0 gives a dash", () => {
    const data = portfolio({
      today: TODAY,
      holdings: [
        holding({ country: "US", currentValue: 5_000, valuations: [val("2025-12-31", 0), val("2026-03-01", 5_000)] }),
      ],
    });
    expect(rows(data)).toEqual([
      ["2026*", "$5K", "$0", "—"],
      ["2025", "$0", "$0", "—"],
    ]);
  });

  it("GR-15 ignores the basis and follows the scope", () => {
    const base = gr14();
    const data = portfolio({
      ...base,
      fx: { today: { rate: 85, asOf: TODAY }, history: [{ date: "2026-02-01", rate: 83 }] },
      holdings: [
        ...base.holdings,
        holding({ id: "h-in", country: "IN", currency: "INR", currentValue: 850_000, valuations: [val("2026-02-01", 830_000)] }),
      ],
    });
    const expected = rows(portfolio(gr14()));
    expect(rows(data, { scope: "us", basis: "today", range: "1Y" })).toEqual(expected);
    // India in scope changes the current year only.
    expect(rows(data)[0]![1]).toBe("$84K");
  });

  it("GR-17 a brand-new item gives a single starred row", () => {
    const data = portfolio({
      today: TODAY,
      holdings: [holding({ country: "US", currentValue: 5_000, valuations: [val(TODAY, 5_000)] })],
    });
    const g = buildGrowth(data, parseGrowthView({}));
    expect(g.header!.line).toBe("Net worth change since Oct 2026 · all countries · $5,000 → $5,000");
    expect(g.waterfall!.rows.slice(1, -1).map((r) => r.amount)).toEqual([0, 0, 0]);
    expect(rows(data)).toEqual([["2026*", "$5K", "$0", "—"]]);
  });

  it("an empty Portfolio has no years", () => {
    expect(buildGrowth(portfolio(), parseGrowthView({})).years).toBeNull();
  });
});
