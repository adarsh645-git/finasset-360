import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Overview } from "@/components/overview/Overview";
import { buildOverview } from "@/lib/views/overview";
import { holding, portfolio } from "../fixtures/portfolio";

const render = (data: ReturnType<typeof portfolio>) =>
  renderToStaticMarkup(<Overview overview={buildOverview(data, { range: "All" })} />);

describe("overview render", () => {
  it("OV-21 first run shows the $0 header and the card, with no chart, controls or cards", () => {
    const html = render(portfolio());

    expect(html).toContain("Net worth · rolled up to USD");
    expect(html).toContain("$0");
    expect(html).toContain("Add your first account or asset");
    expect(html).toContain("appear here once you&#x27;ve added something");
    expect(html).not.toContain("<svg");
    expect(html).not.toMatch(/1Y|3Y|5Y|yr projection|Projection off/);
    expect(html).not.toMatch(/Total assets|Where it|Needs updating|Equity/);
    expect(html).not.toMatch(/<button/);
    expect(html).not.toMatch(/Add account/);
    expect(html).toContain("or a loan");
  });

  it("OV-22 a Portfolio with only archived items renders the first-run card", () => {
    const html = render(
      portfolio({ holdings: [holding({ currentValue: 5_000, archivedAt: "2026-01-01T00:00:00Z" })] }),
    );

    expect(html).toContain("Add your first account or asset");
    expect(html).toContain("$0");
  });

  it("OV-04 with items the header, range segments, projection toggle and chart render", () => {
    const html = render(
      portfolio({
        holdings: [
          holding({ currentValue: 2_000, valuations: [{ date: "2026-01-01", value: 1_000, source: "user" }] }),
        ],
      }),
    );

    expect(html).toContain("$2,000");
    expect(html).toContain("+$1,000 (+100.0%)");
    for (const label of ["1Y", "3Y", "5Y", "All"]) expect(html).toContain(`>${label}<`);
    expect(html).toContain('href="/?range=1Y"');
    expect(html).toContain("10-yr projection on");
    expect(html).toContain("<svg");
    expect(html).not.toContain("Add your first");
  });
});
