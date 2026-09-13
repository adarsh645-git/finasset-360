import { describe, expect, it } from "vitest";
import { computeTargetGap, formatTargetAmountLabel, formatTargetDateLabel } from "@/lib/projection/target-gap";
import type { ProjectionAssumptions } from "@/components/portfolio/types";

function assumptions(overrides: Partial<ProjectionAssumptions>): ProjectionAssumptions {
  return {
    growth_rate: 0.06,
    monthly_contribution: 1000,
    contribution_escalation_rate: 0,
    horizon_years: 10,
    inflation_rate: 0.03,
    target_amount: null,
    target_date: null,
    ...overrides,
  };
}

describe("computeTargetGap", () => {
  it("finds a crossing year later than the target date, matching the real (not nominal) line", () => {
    // Growth alone would clear the target well before 2036 on the nominal
    // line, but inflation drags the real line's crossing out past it.
    const gap = computeTargetGap({
      today: "2026-01-01",
      holdingsTotal: 100_000,
      liabilities: [],
      assumptions: assumptions({ growth_rate: 0.05, monthly_contribution: 2000, inflation_rate: 0.04 }),
      targetAmount: 500_000,
      targetDate: "2036-01-01",
    });

    expect(gap.targetYearIndex).toBe(10);
    expect(gap.crossingYearIndex).not.toBeNull();
    expect(gap.crossingDate).not.toBeNull();
    expect(gap.yearsLate).toBe(gap.crossingYearIndex! - gap.targetYearIndex);
  });

  it("reports a crossing at year 0 when the target is already met today", () => {
    const gap = computeTargetGap({
      today: "2026-01-01",
      holdingsTotal: 1_000_000,
      liabilities: [],
      assumptions: assumptions({}),
      targetAmount: 500_000,
      targetDate: "2030-01-01",
    });

    expect(gap.crossingYearIndex).toBe(0);
    expect(gap.crossingDate).toBe("2026-01-01");
    expect(gap.yearsLate).toBeLessThan(0); // reached years before the target date
    expect(gap.gapAtTargetDate).toBeLessThan(0); // over, not short
  });

  it("returns null crossing fields when the real line never reaches the target at the current plan", () => {
    const gap = computeTargetGap({
      today: "2026-01-01",
      holdingsTotal: 1_000,
      liabilities: [],
      assumptions: assumptions({ growth_rate: 0, monthly_contribution: 0, inflation_rate: 0 }),
      targetAmount: 10_000_000,
      targetDate: "2027-01-01",
    });

    expect(gap.crossingYearIndex).toBeNull();
    expect(gap.crossingDate).toBeNull();
    expect(gap.yearsLate).toBeNull();
    expect(gap.gapAtTargetDate).toBeGreaterThan(0);
  });

  it("reads the gap against the real line, not the nominal one", () => {
    const build = (inflationRate: number) =>
      computeTargetGap({
        today: "2026-01-01",
        holdingsTotal: 100_000,
        liabilities: [],
        assumptions: assumptions({ growth_rate: 0.07, monthly_contribution: 1000, inflation_rate: inflationRate }),
        targetAmount: 300_000,
        targetDate: "2040-01-01",
      });

    const withoutInflation = build(0);
    const withInflation = build(0.05);

    // Same nominal trajectory, but a higher inflation assumption deflates
    // the real line harder, pushing both the gap and the crossing date out
    // — if the gap were reading `netWorth` instead of `realNetWorth`, this
    // assumption would change nothing.
    expect(withInflation.gapAtTargetDate).toBeGreaterThan(withoutInflation.gapAtTargetDate);
    expect(withInflation.crossingYearIndex ?? Infinity).toBeGreaterThanOrEqual(
      withoutInflation.crossingYearIndex ?? Infinity,
    );
  });

  it("floors the target year index at zero for a target date on or before today", () => {
    const gap = computeTargetGap({
      today: "2026-06-15",
      holdingsTotal: 100_000,
      liabilities: [],
      assumptions: assumptions({}),
      targetAmount: 50_000,
      targetDate: "2026-06-15",
    });

    expect(gap.targetYearIndex).toBe(0);
  });
});

describe("formatTargetDateLabel", () => {
  it("reads the date first, then years late", () => {
    const label = formatTargetDateLabel({
      targetAmount: 6_000_000,
      targetDate: "2046-01-01",
      targetYearIndex: 20,
      gapAtTargetDate: 1_478_545,
      crossingYearIndex: 25,
      crossingDate: "2051-01-01",
      yearsLate: 5,
    });
    expect(label).toBe("2051 — 5 years late");
  });

  it("reads years early when the crossing lands before the target date", () => {
    const label = formatTargetDateLabel({
      targetAmount: 500_000,
      targetDate: "2036-01-01",
      targetYearIndex: 10,
      gapAtTargetDate: -50_000,
      crossingYearIndex: 8,
      crossingDate: "2034-01-01",
      yearsLate: -2,
    });
    expect(label).toBe("2034 — 2 years early");
  });

  it("degrades gracefully when the target is never reached within the search window", () => {
    const label = formatTargetDateLabel({
      targetAmount: 10_000_000,
      targetDate: "2027-01-01",
      targetYearIndex: 1,
      gapAtTargetDate: 9_000_000,
      crossingYearIndex: null,
      crossingDate: null,
      yearsLate: null,
    });
    expect(label).toBe("Not reached within 51 years at your current plan");
  });
});

describe("formatTargetAmountLabel", () => {
  it("reports a shortfall", () => {
    const label = formatTargetAmountLabel(
      {
        targetAmount: 6_000_000,
        targetDate: "2046-01-01",
        targetYearIndex: 20,
        gapAtTargetDate: 1_478_545,
        crossingYearIndex: 25,
        crossingDate: "2051-01-01",
        yearsLate: 5,
      },
      "USD",
    );
    expect(label).toContain("short at your target date");
  });

  it("reports a surplus", () => {
    const label = formatTargetAmountLabel(
      {
        targetAmount: 500_000,
        targetDate: "2030-01-01",
        targetYearIndex: 4,
        gapAtTargetDate: -50_000,
        crossingYearIndex: 2,
        crossingDate: "2028-01-01",
        yearsLate: -2,
      },
      "USD",
    );
    expect(label).toContain("over at your target date");
  });
});
