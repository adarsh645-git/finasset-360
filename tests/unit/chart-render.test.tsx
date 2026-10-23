import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Chart } from "@/components/chart/Chart";
import { createHoverController } from "@/components/chart/hover";
import { ProjectionProvider, ProjectionToggle } from "@/components/chart/ProjectionProvider";

afterEach(() => vi.useRealTimers());

describe("chart touch", () => {
  it("CH-13 the touch tooltip clears after release", () => {
    vi.useFakeTimers();
    const seen: Array<number | null> = [];
    const c = createHoverController((i) => seen.push(i));
    c.touch(3);
    c.touchEnd();
    vi.advanceTimersByTime(1799);
    expect(seen.at(-1)).toBe(3);
    vi.advanceTimersByTime(1);
    expect(seen.at(-1)).toBeNull();
  });

  it("CH-13 a new touch cancels the pending clear", () => {
    vi.useFakeTimers();
    const seen: Array<number | null> = [];
    const c = createHoverController((i) => seen.push(i));
    c.touch(1);
    c.touchEnd();
    vi.advanceTimersByTime(1000);
    c.touch(2);
    vi.advanceTimersByTime(5000);
    expect(seen.at(-1)).toBe(2);
  });
});

describe("chart markup", () => {
  it("CH-14 phone rules are present in the chart's markup", () => {
    const html = renderToStaticMarkup(
      <ProjectionProvider initial={true} horizon={10}>
        <Chart
          height={270}
          today="2026-10-13"
          series={[
            {
              name: "Net worth",
              color: "#000",
              endLabel: true,
              points: [
                { date: "2025-10-31", value: 100 },
                { date: "2026-10-13", value: 200 },
              ],
            },
          ]}
          legend={<span>Legend</span>}
        />
      </ProjectionProvider>,
    );
    expect(html).toContain("211px");
    expect(html).toContain("36px");
    expect(html).toMatch(/<div[^>]*max-sm:hidden[^>]*data-chart-end-labels|<div[^>]*data-chart-end-labels[^>]*max-sm:hidden/);
    expect(html).toContain("pan-y");
    expect(html.indexOf("data-chart-plot")).toBeLessThan(html.indexOf("Legend"));
  });

  it("CH-07 the toggle reads the shared setting", () => {
    const render = (initial: boolean) =>
      renderToStaticMarkup(
        <ProjectionProvider initial={initial} horizon={10}>
          <ProjectionToggle />
        </ProjectionProvider>,
      );
    expect(render(true)).toContain("10-yr projection on");
    expect(render(false)).toContain("Projection off");
  });
});
