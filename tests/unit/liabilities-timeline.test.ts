import { describe, expect, it } from "vitest";
import { netWorthOn, type FxRate } from "@/lib/calc";
import { layoutChart, tooltipAt } from "@/lib/chart";
import { buildLiabilities } from "@/lib/views/liabilities";
import { projectFromToday } from "@/lib/views/projection";
import { historyItem } from "@/lib/views/shell";
import { liability, portfolio } from "../fixtures/portfolio";

const TODAY = "2026-10-14";
const val = (date: string, value: number) => ({ date, value, source: "user" as const });
const RATES: FxRate[] = [{ date: "2026-01-01", rate: 80 }];

const base = (liabilities: ReturnType<typeof liability>[]) => {
  const p = portfolio({
    today: TODAY,
    fx: { today: { rate: 80, asOf: TODAY }, history: RATES },
    liabilities,
  });
  return { ...p, assumptions: { ...p.assumptions, horizonYears: 2 } };
};

describe("payoff timeline", () => {
  it("LB-10 the stack's top equals total Liabilities at every sample", () => {
    const data = base([
      liability({
        id: "big",
        name: "Mortgage",
        currentBalance: 200_000,
        principal: 210_000,
        apr: 6,
        monthlyPayment: 2_000,
        valuations: [val("2026-01-15", 205_000), val(TODAY, 200_000)],
      }),
      liability({
        id: "small",
        name: "Car",
        country: "IN",
        currency: "INR",
        currentBalance: 160_000,
        principal: 200_000,
        apr: 0,
        monthlyPayment: 40_000,
        valuations: [val("2026-03-01", 180_000), val(TODAY, 160_000)],
      }),
    ]);
    const timeline = buildLiabilities(data).timeline!;
    const layers = timeline.series;
    const top = layers.at(-1)!;
    const projected = projectFromToday(data).liabilities;

    expect(layers.map((l) => l.name)).toEqual(["Mortgage", "Car"]);
    const todayIndex = top.points.findIndex((p) => p.date === TODAY);
    expect(todayIndex).toBeGreaterThan(0);
    expect(top.points[0]!.date).toBe("2026-01-15");
    top.points.forEach((p, i) => {
      const expected =
        i <= todayIndex
          ? -netWorthOn(
              { holdings: [], liabilities: data.liabilities.map(historyItem) },
              RATES,
              p.date,
              TODAY,
            )
          : projected[i - todayIndex - 1]!;
      expect(p.value).toBeCloseTo(expected, 4);
    });
    expect(top.points.length - 1 - todayIndex).toBe(projected.length);

    // The Car (160,000 INR at 40,000/mo) is paid off in month 4 and stays 0.
    const car = layers[1]!.tip!;
    const at = (k: number) => car[todayIndex + k]!.value;
    expect(at(3)).toBeGreaterThan(0);
    expect(at(4)).toBe(0);
    expect(at(5)).toBe(0);
    expect(car.at(-1)!.value).toBe(0);
  });

  it("LB-11 projection off ends at today, and an archived loan counts only while held", () => {
    const data = base([
      liability({
        id: "live",
        name: "Mortgage",
        currentBalance: 100_000,
        principal: 100_000,
        monthlyPayment: 1_000,
        valuations: [val("2026-01-14", 100_000), val(TODAY, 100_000)],
      }),
      liability({
        id: "gone",
        name: "Old card",
        currentBalance: 0,
        archivedAt: "2026-07-14T00:00:00Z",
        valuations: [val("2026-01-14", 5_000), val("2026-07-14", 3_000)],
      }),
    ]);
    const { timeline } = buildLiabilities(data);
    const layout = layoutChart({
      series: timeline!.series,
      today: timeline!.today,
      projection: false,
      zero: timeline!.zero,
    });
    expect(layout.dates.at(-1)).toBe(TODAY);

    const gone = timeline!.series.find((s) => s.name === "Old card")!;
    const own = new Map(gone.tip!.map((p) => [p.date, p.value]));
    expect(own.get("2026-06-30")).toBeGreaterThan(3_000);
    expect(own.get("2026-07-31")).toBe(0);
    expect(own.get(TODAY)).toBe(0);

    const tip = tooltipAt(layout, layout.dates.indexOf("2026-06-30"));
    const row = (name: string) => tip.rows.find((r) => r.name === name)!;
    expect(row("Mortgage").value).toBe("$100,000");
    expect(row("Old card").value).toMatch(/^\$3,\d{3}$/);
  });

  it("LB-10 no timeline without an active loan", () => {
    expect(buildLiabilities(base([])).timeline).toBeNull();
  });
});
