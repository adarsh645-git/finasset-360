import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { GoalsPage } from "@/components/goals/GoalsPage";
import { buildGoalsPage } from "@/lib/views/goals";
import { holding, portfolio } from "../fixtures/portfolio";

const SUBTITLE =
  "Projected dates use the country-specific growth rates set on the Growth page, current loan payments and your monthly savings. Amounts are nominal.";

const render = (goals: { id: string; name: string | null; targetUsd: number }[]) =>
  renderToStaticMarkup(
    <GoalsPage
      page={buildGoalsPage(portfolio({ holdings: [holding({ currentValue: 140_000 })], goals }))}
    />,
  );

describe("goals page render", () => {
  it.each([
    ["no Goals", []],
    [
      "two Goals",
      [
        { id: "a", name: "One", targetUsd: 150_000 },
        { id: "b", name: null, targetUsd: 250_000 },
      ],
    ],
  ])("GO-08 shows the heading and subtitle with %s", (_label, goals) => {
    const html = render(goals);
    expect(html).toContain("Net worth milestones");
    expect(html).toContain(SUBTITLE);
  });

  it("GO-09 an empty Goals page says 'No goals yet' with no cards", () => {
    const html = render([]);
    expect(html).toContain("No goals yet");
    expect(html).not.toContain("data-goal=");
    // The add form (ticket 2) renders into this slot, after the empty state.
    expect(html.indexOf("No goals yet")).toBeLessThan(html.indexOf('data-slot="goal-form"'));
  });

  it("GO-01 renders the cards in target order with name, status, progress and bar", () => {
    const html = render([
      { id: "a", name: "Small", targetUsd: 100_000 },
      { id: "b", name: null, targetUsd: 250_000 },
    ]);
    expect(html.indexOf("Small")).toBeLessThan(html.indexOf("$250K net worth"));
    expect(html).toContain("Reached");
    expect(html).toContain("$140K of $250K");
    expect(html).toContain('data-percent="56"');
  });
});
