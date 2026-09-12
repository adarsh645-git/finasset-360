import { describe, expect, it } from "vitest";
import { projectHoldingValue, projectNetWorth } from "@/lib/projection/engine";
import type { ProjectionAssumptions } from "@/components/portfolio/types";

function assumptions(overrides: Partial<ProjectionAssumptions>): ProjectionAssumptions {
  return {
    growth_rate: 0.07,
    monthly_contribution: 0,
    contribution_escalation_rate: 0,
    horizon_years: 10,
    ...overrides,
  };
}

/** An independent oracle, not the code under test restated: walks the
 * Holdings total forward one month at a time, crediting the escalating
 * contribution at the end of each month, exactly as docs/SPEC.md describes
 * the closed form it's meant to verify. The closed form is checked against
 * *this*, never against a recorded snapshot of its own output. */
function simulateMonthByMonth(
  holdingsTotal: number,
  growthRate: number,
  monthlyContribution: number,
  contributionEscalationRate: number,
  horizonYears: number,
): number {
  const monthlyRate = growthRate / 12;
  let balance = holdingsTotal;
  for (let month = 1; month <= horizonYears * 12; month++) {
    const yearIndex = Math.floor((month - 1) / 12);
    const contribution = monthlyContribution * Math.pow(1 + contributionEscalationRate, yearIndex);
    balance = balance * (1 + monthlyRate) + contribution;
  }
  return balance;
}

describe("projectNetWorth", () => {
  it("matches an independent month-by-month simulation across a multi-segment case", () => {
    const holdingsTotal = 250_000;
    const growthRate = 0.06;
    const monthlyContribution = 1500;
    const contributionEscalationRate = 0.04;
    const horizonYears = 7;

    const [last] = projectNetWorth({
      today: "2026-01-01",
      holdingsTotal,
      liabilities: [],
      assumptions: assumptions({
        growth_rate: growthRate,
        monthly_contribution: monthlyContribution,
        contribution_escalation_rate: contributionEscalationRate,
        horizon_years: horizonYears,
      }),
    }).slice(-1);

    const expected = simulateMonthByMonth(
      holdingsTotal,
      growthRate,
      monthlyContribution,
      contributionEscalationRate,
      horizonYears,
    );

    expect(last.yearIndex).toBe(horizonYears);
    expect(last.holdingsTotal / expected).toBeCloseTo(1, 7);
  });

  it("steps the contribution once per escalation year, asserted segment by segment", () => {
    const points = projectNetWorth({
      today: "2026-01-01",
      holdingsTotal: 0,
      liabilities: [],
      assumptions: assumptions({
        growth_rate: 0.06,
        monthly_contribution: 1000,
        contribution_escalation_rate: 0.05,
        horizon_years: 3,
      }),
    });

    // Year 1 grows at C1 = 1000; year 2 at C2 = 1050; year 3 at C3 = 1102.50
    // — each a fresh closed-form segment chained off the last, not one
    // evaluation over the full horizon.
    const r = 0.06 / 12;
    const fv = (principal: number, contribution: number) =>
      principal * Math.pow(1 + r, 12) + contribution * ((Math.pow(1 + r, 12) - 1) / r);

    const year1 = fv(0, 1000);
    const year2 = fv(year1, 1050);
    const year3 = fv(year2, 1102.5);

    expect(points[1].holdingsTotal).toBeCloseTo(year1, 6);
    expect(points[2].holdingsTotal).toBeCloseTo(year2, 6);
    expect(points[3].holdingsTotal).toBeCloseTo(year3, 6);
  });

  it("holds a Liability with no Amortization Assumptions exactly flat across the horizon", () => {
    const points = projectNetWorth({
      today: "2026-01-01",
      holdingsTotal: 100_000,
      liabilities: [
        { id: "l1", currentAmount: 20_000 },
        { id: "l2", currentAmount: 5_000 },
      ],
      assumptions: assumptions({ horizon_years: 5 }),
    });

    for (const point of points) {
      expect(point.liabilitiesTotal).toBe(25_000);
    }
  });

  it("nets Holdings and Liabilities separately rather than growing an already-netted figure", () => {
    const points = projectNetWorth({
      today: "2026-01-01",
      holdingsTotal: 100_000,
      liabilities: [{ id: "l1", currentAmount: 40_000 }],
      assumptions: assumptions({ growth_rate: 0.05, horizon_years: 5 }),
    });

    const last = points[points.length - 1];
    expect(last.holdingsTotal).toBeCloseTo(100_000 * Math.pow(1 + 0.05 / 12, 60), 6);
    expect(last.liabilitiesTotal).toBe(40_000);
    expect(last.netWorth).toBeCloseTo(last.holdingsTotal - 40_000, 6);
  });

  it("returns only the today point at a zero horizon", () => {
    const points = projectNetWorth({
      today: "2026-01-01",
      holdingsTotal: 100_000,
      liabilities: [{ id: "l1", currentAmount: 10_000 }],
      assumptions: assumptions({ horizon_years: 0 }),
    });

    expect(points).toEqual([
      { date: "2026-01-01", yearIndex: 0, holdingsTotal: 100_000, liabilitiesTotal: 10_000, netWorth: 90_000 },
    ]);
  });

  it("handles zero growth by adding contributions linearly, without dividing by zero", () => {
    const points = projectNetWorth({
      today: "2026-01-01",
      holdingsTotal: 10_000,
      liabilities: [],
      assumptions: assumptions({
        growth_rate: 0,
        monthly_contribution: 100,
        contribution_escalation_rate: 0,
        horizon_years: 2,
      }),
    });

    expect(points[1].holdingsTotal).toBeCloseTo(10_000 + 100 * 12, 9);
    expect(points[2].holdingsTotal).toBeCloseTo(10_000 + 100 * 24, 9);
  });

  it("projects zero Holdings and no Liabilities without error", () => {
    const points = projectNetWorth({
      today: "2026-01-01",
      holdingsTotal: 0,
      liabilities: [],
      assumptions: assumptions({ horizon_years: 3 }),
    });

    expect(points.every((point) => point.netWorth === point.holdingsTotal)).toBe(true);
    expect(points[3].holdingsTotal).toBe(0);
  });

  it("advances the date by calendar years from the injected today", () => {
    const points = projectNetWorth({
      today: "2026-03-15",
      holdingsTotal: 1000,
      liabilities: [],
      assumptions: assumptions({ horizon_years: 2 }),
    });

    expect(points.map((p) => p.date)).toEqual(["2026-03-15", "2027-03-15", "2028-03-15"]);
  });
});

describe("projectHoldingValue", () => {
  it("grows a single Holding with no contribution allocated to it", () => {
    const points = projectHoldingValue({
      today: "2026-01-01",
      currentAmount: 50_000,
      growthRate: 0.08,
      horizonYears: 4,
    });

    const expected = 50_000 * Math.pow(1 + 0.08 / 12, 48);
    expect(points[points.length - 1].amount).toBeCloseTo(expected, 6);
  });

  it("returns only today's amount at a zero horizon", () => {
    const points = projectHoldingValue({
      today: "2026-01-01",
      currentAmount: 50_000,
      growthRate: 0.08,
      horizonYears: 0,
    });

    expect(points).toEqual([{ date: "2026-01-01", yearIndex: 0, amount: 50_000 }]);
  });
});
