import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { GrowthPage } from "@/components/growth/GrowthPage";
import { buildGrowth, parseGrowthView } from "@/lib/views/growth";
import { holding, portfolio } from "../fixtures/portfolio";

const render = (data: ReturnType<typeof portfolio>) =>
  renderToStaticMarkup(<GrowthPage growth={buildGrowth(data, parseGrowthView({}))} />);

describe("growth render", () => {
  it.each([
    ["nothing", portfolio()],
    [
      "only archived items",
      portfolio({ holdings: [holding({ currentValue: 5, archivedAt: "2026-01-01T00:00:00Z" })] }),
    ],
  ])("GR-16 an empty Portfolio (%s) shows only the add link", (_, data) => {
    const html = render(data);

    expect(html).toContain("Add an account or asset");
    expect(html).toContain('href="/growth?modal=add-asset"');
    expect(html).not.toMatch(/1Y|3Y|5Y|projection on|Projection off/);
    expect(html).not.toMatch(/United States|<svg|Where the change|Year by year/);
  });
});
