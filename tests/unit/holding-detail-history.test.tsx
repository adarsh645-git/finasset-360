import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { HoldingDetail } from "@/components/holding/HoldingDetail";
import type { HoldingData, PortfolioData } from "@/lib/read-model/types";
import { buildHoldingDetail } from "@/lib/views/holding-detail";
import { holding, portfolio } from "../fixtures/portfolio";

const TODAY = "2026-10-14";
const data = (holdings: HoldingData[], over: Partial<PortfolioData> = {}) =>
  portfolio({
    today: TODAY,
    fx: {
      today: { rate: 83.4, asOf: TODAY },
      history: [
        { date: "2026-06-30", rate: 80 },
        { date: "2026-09-30", rate: 82 },
        { date: TODAY, rate: 83.4 },
      ],
    },
    holdings,
    ...over,
  });
const detail = (h: HoldingData) => buildHoldingDetail(data([h]), { holdingId: h.id })!;
const user = (date: string, value: number) => ({ date, value, source: "user" as const });
const series = (h: HoldingData) => detail(h).chart.series[0]!.points;

describe("holding detail chart and Value log", () => {
  it("HD-18 the chart runs from the first Valuation at each date's FX Rate, then projects", () => {
    const h = holding({
      id: "h1", assetClass: "cash", country: "IN", currency: "INR", currentValue: 640_000,
      valuations: [user("2026-06-30", 300_000), user("2026-09-30", 640_000)],
    });
    const d = detail(h);
    expect(d.chart.title).toBe("Value over time");
    expect(d.chart.sub).toBe("Shown in USD; includes rupee movement");
    const pts = series(h);
    const recorded = pts.filter((p) => p.date <= TODAY);
    expect(recorded.map((p) => p.date)).toEqual(["2026-06-30", "2026-07-31", "2026-08-31", "2026-09-30", TODAY]);
    expect(recorded[0]!.value).toBeCloseTo(300_000 / 80, 6);
    expect(recorded[3]!.value).toBeCloseTo(640_000 / 82, 6);
    expect(recorded[4]!.value).toBeCloseTo(640_000 / 83.4, 6);
    const projected = pts.filter((p) => p.date > TODAY);
    expect(projected.length).toBe(120);
    expect(projected[0]!.date).toBe("2026-11-14");
    expect(projected[0]!.value).toBeGreaterThan(recorded[4]!.value * 0.99);
  });

  it("HD-18 a US Holding's sub-title is the interpolation note", () => {
    const h = holding({ id: "h1", assetClass: "cash", currentValue: 10, valuations: [user("2026-09-01", 10)] });
    expect(detail(h).chart.sub).toBe("Interpolated between logged values");
  });

  it("HD-19 a brand-new Holding has one recorded point, then its Projection, and one log row", () => {
    const h = holding({ id: "h1", assetClass: "cash", currentValue: 1_000, valuations: [user(TODAY, 1_000)] });
    const pts = series(h);
    expect(pts.filter((p) => p.date <= TODAY)).toEqual([{ date: TODAY, value: 1_000 }]);
    expect(pts.length).toBeGreaterThan(1);
    expect(detail(h).valueLog.rows).toHaveLength(1);
  });

  it("HD-20 a manual Holding's log lists every Valuation, newest first", () => {
    const h = holding({
      id: "h1", assetClass: "cash", currentValue: 6_200,
      valuations: [user("2026-06-02", 5_000), user("2026-10-14", 6_200), user("2026-08-10", 5_600)],
    });
    expect(detail(h).valueLog.title).toBe("Logged whenever you update");
    expect(detail(h).valueLog.rows).toEqual([
      { date: "Oct 14, 2026", value: "$6,200", change: "+$600 · +10.7%" },
      { date: "Aug 10, 2026", value: "$5,600", change: "+$600 · +12.0%" },
      { date: "Jun 2, 2026 · added", value: "$5,000", change: "—" },
    ]);
  });

  it("HD-21 a Stocks Holding's log is each earlier month's last Valuation plus today", () => {
    const h = holding({
      id: "h1", assetClass: "stocks", currentValue: 10_653,
      valuations: [
        user("2026-08-30", 10_000), user("2026-08-31", 10_100), user("2026-09-15", 10_300),
        user("2026-09-30", 10_400), user("2026-10-13", 10_600),
      ],
    });
    expect(detail(h).valueLog.rows).toEqual([
      { date: "Oct 14, 2026", value: "$10,653", change: "+$253 · +2.4%" },
      { date: "Sep 2026", value: "$10,400", change: "+$300 · +3.0%" },
      { date: "Aug 2026 · added", value: "$10,100", change: "—" },
    ]);
  });

  it("HD-18 the page renders the chart section and the Value log", () => {
    const h = holding({
      id: "h1", assetClass: "cash", currentValue: 6_200,
      valuations: [user("2026-08-10", 5_600), user("2026-10-14", 6_200)],
    });
    const html = renderToStaticMarkup(<HoldingDetail detail={detail(h)} />);
    expect(html).toContain("Value over time");
    expect(html).toContain("Logged whenever you update");
    expect(html).toContain("Aug 10, 2026 · added");
  });
});
