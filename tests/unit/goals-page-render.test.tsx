import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { GoalsPage } from "@/components/goals/GoalsPage";
import { buildGoalsPage } from "@/lib/views/goals";
import { holding, portfolio } from "../fixtures/portfolio";

// The form and Remove buttons read the router.
vi.mock("next/navigation", () => ({
  usePathname: () => "/goals",
  useRouter: () => ({ push: () => {}, refresh: () => {}, replace: () => {} }),
}));

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

  it("GO-12 each card offers Remove and no edit control", () => {
    const html = render([
      { id: "a", name: "One", targetUsd: 150_000 },
      { id: "b", name: "Two", targetUsd: 250_000 },
    ]);
    expect(html.match(/>Remove</g)).toHaveLength(2);
    expect(html).not.toMatch(/edit/i);
  });

  it("GO-09 the add form follows the cards and the empty state", () => {
    const html = render([{ id: "a", name: "One", targetUsd: 150_000 }]);
    expect(html).toContain("<form");
    expect(html).toContain('inputMode="decimal"');
    expect(html).toContain("Add goal");
    expect(html.indexOf("data-goal=")).toBeLessThan(html.indexOf("Add goal"));
    expect(render([]).indexOf("No goals yet")).toBeLessThan(render([]).indexOf("Add goal"));
  });
});
