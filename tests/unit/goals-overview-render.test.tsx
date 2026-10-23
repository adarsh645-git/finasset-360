import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Overview } from "@/components/overview/Overview";
import { buildOverview } from "@/lib/views/overview";
import { holding, portfolio } from "../fixtures/portfolio";

const flat = { inflation: 0, realestate: 0, stocks: 0, cash: 0 };

function render(goals: { name: string; targetUsd: number }[]) {
  const data = portfolio({
    today: "2026-10-15",
    holdings: [
      holding({
        assetClass: "cash",
        currentValue: 400_000,
        valuations: [
          { date: "2025-01-31", value: 100_000, source: "user" },
          { date: "2026-10-01", value: 400_000, source: "user" },
        ],
      }),
    ],
    assumptions: {
      horizonYears: null,
      savingsGrowth: 0,
      shared: { crypto: 0, metals: 0, other: 0 },
      byCountry: {
        US: { ...flat, monthlySavings: null },
        IN: { ...flat, monthlySavings: null },
      },
    },
    goals: goals.map((g, i) => ({ id: `g${i}`, ...g })),
  });
  return renderToStaticMarkup(<Overview overview={buildOverview(data, { range: "All" })} />);
}

describe("goals on the overview render", () => {
  it("GO-14 no Goals card when nothing is unreached", () => {
    const html = render([{ name: "Done", targetUsd: 100_000 }]);
    expect(html).not.toContain("All goals");
  });

  it("GO-13 the card shows name, status and a link to the Goals page", () => {
    const html = render([{ name: "Million", targetUsd: 1_000_000 }]);
    expect(html).toContain("Million");
    expect(html).toContain("Beyond the 10-year projection");
    expect(html).toContain('href="/goals"');
    expect(html).toContain("All goals");
  });

  it("GO-16 a nearby Goal is drawn and a distant one is not", () => {
    const html = render([
      { name: "Quarter million", targetUsd: 250_000 },
      { name: "Ten million", targetUsd: 10_000_000 },
    ]);
    // The chart is the first section; the Goals card comes later.
    const chart = html.slice(0, html.indexOf("</section>"));
    expect(chart).toContain("Quarter million");
    expect(chart).not.toContain("Ten million");
    expect(chart).toContain("stroke-dasharray");
  });
});
