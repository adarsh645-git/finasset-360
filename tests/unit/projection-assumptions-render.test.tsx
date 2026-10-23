import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { GrowthPage } from "@/components/growth/GrowthPage";
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
