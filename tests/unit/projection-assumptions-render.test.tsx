import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { GrowthPage } from "@/components/growth/GrowthPage";
import { projectionLabel } from "@/lib/chart/projection";
import { buildGrowth, parseGrowthView } from "@/lib/views/growth";
import { buildAssumptions } from "@/lib/views/projection-assumptions";
import { portfolio } from "../fixtures/portfolio";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));

describe("assumptions card render", () => {
  it("PA-01 the empty Growth page still shows the editable card with its saved value", () => {
    const data = portfolio();
    data.assumptions.byCountry.US.stocks = 7.5;
    const view = parseGrowthView({});
    const html = renderToStaticMarkup(
      <GrowthPage growth={buildGrowth(data, view)} assumptions={buildAssumptions(data, view)} />,
    );

    expect(html).toContain("Add an account or asset");
    expect(html).toContain("Projection assumptions");
    expect(html).toContain("Shared across countries");
    expect(html).toMatch(/<input[^>]*aria-label="Stocks"[^>]*value="7.5"/);
    expect(html).not.toMatch(/<svg|Where the change|Year by year/);
  });
});

describe("assumptions card header and footer", () => {
  const render = (data = portfolio({ today: "2026-10-13" })) => {
    const view = parseGrowthView({});
    return renderToStaticMarkup(
      <GrowthPage growth={buildGrowth(data, view)} assumptions={buildAssumptions(data, view)} />,
    );
  };

  it("PA-01 the header holds the horizon input beside Reset defaults", () => {
    const data = portfolio({ today: "2026-10-13" });
    data.assumptions.horizonYears = 15;
    const html = render(data);
    expect(html).toMatch(/<input[^>]*aria-label="Horizon"[^>]*placeholder="10"[^>]*value="15"/);
    expect(html).toContain("Reset defaults");
  });

  it("PA-13 the footer shows even on the empty page", () => {
    const data = portfolio({ today: "2026-10-13" });
    data.assumptions.byCountry.US.monthlySavings = 1000;
    const html = render(data);
    expect(html).toContain("Projection for all countries");
    expect(html).toContain("Net worth by Oct 2036");
    expect(html).toContain("$171,052");
    expect(html).toContain("$127,279");
    expect(html).toContain("Lost to inflation");
    expect(html).toContain("$43,773");
  });

  it("PA-14 a saved horizon of 15 relabels the toggle", () => {
    expect(projectionLabel(true, 15)).toBe("15-yr projection on");
    expect(projectionLabel(true, 10)).toBe("10-yr projection on");
  });
});
