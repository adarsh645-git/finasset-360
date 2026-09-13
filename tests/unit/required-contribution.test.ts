import { describe, expect, it } from "vitest";
import {
  computeRequiredContribution,
  formatRequiredContributionLabel,
  type RequiredContribution,
} from "@/lib/projection/required-contribution";
import { projectNetWorth, type ProjectionLiabilityInput } from "@/lib/projection/engine";
import type { TargetGap } from "@/lib/projection/target-gap";
import type { ProjectionAssumptions } from "@/components/portfolio/types";

function assumptions(overrides: Partial<ProjectionAssumptions>): ProjectionAssumptions {
  return {
    growth_rate: 0.06,
    monthly_contribution: 1000,
    contribution_escalation_rate: 0,
    horizon_years: 20,
    inflation_rate: 0.03,
    target_amount: null,
    target_date: null,
    ...overrides,
  };
}

const AMORTIZING_LIABILITY: ProjectionLiabilityInput = {
  id: "mortgage",
  currentAmount: 300_000,
  amortization: {
    interest_rate: 0.05,
    original_loan_amount: 300_000,
    term_months: 240,
    custom_monthly_payment: null,
    extra_monthly_payment: 0,
    escrow_portion: 200,
  },
};

describe("computeRequiredContribution", () => {
  it("solves for a starting contribution that lands the real line exactly on the target", () => {
    // With no Liabilities and no escalation, this is a plain closed-form
    // check that the solved figure, replayed through the same engine, lands
    // on the target it was solved for — the property the solver exists for.
    const params = {
      today: "2026-01-01",
      holdingsTotal: 100_000,
      liabilities: [] as ProjectionLiabilityInput[],
      assumptions: assumptions({ growth_rate: 0.05, contribution_escalation_rate: 0, inflation_rate: 0.02 }),
      targetAmount: 500_000,
      targetDate: "2036-01-01",
    };

    const result = computeRequiredContribution(params);

    const replay = projectNetWorth({
      today: params.today,
      holdingsTotal: params.holdingsTotal,
      liabilities: params.liabilities,
      assumptions: { ...params.assumptions, monthly_contribution: result.requiredMonthlyContribution, horizon_years: 10 },
    });

    expect(replay[10].realNetWorth).toBeCloseTo(params.targetAmount, 6);
  });

  it("still lands on the target with escalation and an amortizing Liability in the mix", () => {
    // Amortization schedules don't depend on the Holdings-side contribution
    // (docs/SPEC.md), so the affine relationship — and therefore the solve
    // — should survive a freed-payment redirect and a non-zero escalation
    // rate untouched.
    const params = {
      today: "2026-01-01",
      holdingsTotal: 200_000,
      liabilities: [AMORTIZING_LIABILITY],
      assumptions: assumptions({ growth_rate: 0.06, contribution_escalation_rate: 0.03, inflation_rate: 0.025 }),
      targetAmount: 1_200_000,
      targetDate: "2046-01-01",
    };

    const result = computeRequiredContribution(params);

    const replay = projectNetWorth({
      today: params.today,
      holdingsTotal: params.holdingsTotal,
      liabilities: params.liabilities,
      assumptions: { ...params.assumptions, monthly_contribution: result.requiredMonthlyContribution, horizon_years: 20 },
    });

    expect(replay[20].realNetWorth).toBeCloseTo(params.targetAmount, 6);
  });

  it("is linear in the starting contribution: equal deltas across equal contribution steps", () => {
    const at = (monthlyContribution: number) =>
      projectNetWorth({
        today: "2026-01-01",
        holdingsTotal: 250_000,
        liabilities: [AMORTIZING_LIABILITY],
        assumptions: assumptions({
          monthly_contribution: monthlyContribution,
          contribution_escalation_rate: 0.04,
          horizon_years: 20,
        }),
      })[20].realNetWorth;

    const f0 = at(0);
    const f1000 = at(1000);
    const f2000 = at(2000);

    expect(f1000 - f0).toBeCloseTo(f2000 - f1000, 6);
  });

  it("returns a negative (withdrawal-capacity) result, still escalating, when the Portfolio alone clears the target", () => {
    const params = {
      today: "2026-01-01",
      holdingsTotal: 3_000_000,
      liabilities: [] as ProjectionLiabilityInput[],
      assumptions: assumptions({
        growth_rate: 0.05,
        monthly_contribution: 1000,
        contribution_escalation_rate: 0.05,
        inflation_rate: 0,
      }),
      targetAmount: 2_000_000,
      targetDate: "2036-01-01",
    };

    const result = computeRequiredContribution(params);
    expect(result.requiredMonthlyContribution).toBeLessThan(0);

    // Re-solving at 0% escalation for a negative figure is explicitly
    // rejected (docs/SPEC.md) — the same escalation rate must still apply
    // on the negative (withdrawal) figure, so replaying it must land on the
    // target exactly, same as the positive-contribution case above.
    const replay = projectNetWorth({
      today: params.today,
      holdingsTotal: params.holdingsTotal,
      liabilities: params.liabilities,
      assumptions: { ...params.assumptions, monthly_contribution: result.requiredMonthlyContribution, horizon_years: 10 },
    });
    expect(replay[10].realNetWorth).toBeCloseTo(params.targetAmount, 3);
  });

  it("stays finite and defined for a target date this year, rather than dividing by a zero-length horizon", () => {
    // A target date on or before today has no full year for a *monthly*
    // contribution to act on — the spec bans an infinite or undefined
    // result, so the solver floors its own horizon at one year (the
    // spec's own worked extreme case) rather than the zero `computeTargetGap`
    // uses for display purposes.
    const result = computeRequiredContribution({
      today: "2026-06-01",
      holdingsTotal: 100_000,
      liabilities: [],
      assumptions: assumptions({ growth_rate: 0.05 }),
      targetAmount: 500_000,
      targetDate: "2026-08-01",
    });

    expect(Number.isFinite(result.requiredMonthlyContribution)).toBe(true);
  });

  it("requires more against the real line than it would against the nominal one", () => {
    // The 2.6x figure in docs/SPEC.md is this comparison's whole point: a
    // solver that read `netWorth` instead of `realNetWorth` would land on a
    // smaller, wrong number.
    const params = {
      today: "2026-01-01",
      holdingsTotal: 300_000,
      liabilities: [] as ProjectionLiabilityInput[],
      assumptions: assumptions({ growth_rate: 0.06, inflation_rate: 0.03 }),
      targetAmount: 2_000_000,
      targetDate: "2046-01-01",
    };

    const requiredAgainstReal = computeRequiredContribution(params).requiredMonthlyContribution;

    const points = projectNetWorth({
      today: params.today,
      holdingsTotal: params.holdingsTotal,
      liabilities: params.liabilities,
      assumptions: { ...params.assumptions, monthly_contribution: 0, horizon_years: 20 },
    });
    const nominalAtZero = points[20].netWorth;
    const nominalAtOne = projectNetWorth({
      today: params.today,
      holdingsTotal: params.holdingsTotal,
      liabilities: params.liabilities,
      assumptions: { ...params.assumptions, monthly_contribution: 1, horizon_years: 20 },
    })[20].netWorth;
    const requiredAgainstNominal = (params.targetAmount - nominalAtZero) / (nominalAtOne - nominalAtZero);

    expect(requiredAgainstReal).toBeGreaterThan(requiredAgainstNominal);
  });
});

describe("formatRequiredContributionLabel", () => {
  const targetGap: TargetGap = {
    targetAmount: 6_000_000,
    targetDate: "2046-01-01",
    targetYearIndex: 20,
    gapAtTargetDate: 1_478_545,
    crossingYearIndex: 25,
    crossingDate: "2051-01-01",
    yearsLate: 5,
  };

  it("states the required figure paired with the achievable date, when above the current contribution", () => {
    const result: RequiredContribution = { requiredMonthlyContribution: 16_893, currentMonthlyContribution: 7_400 };
    const label = formatRequiredContributionLabel(result, targetGap, "USD");
    expect(label).toContain("You'd need");
    expect(label).toContain("2051");
  });

  it("reads as headroom when the required figure is at or below the current contribution, still paired with the achievable date", () => {
    const result: RequiredContribution = { requiredMonthlyContribution: 5_000, currentMonthlyContribution: 7_400 };
    const label = formatRequiredContributionLabel(result, targetGap, "USD");
    expect(label).toContain("headroom");
    expect(label).not.toContain("Withdrawal");
    expect(label).toContain("2051");
  });

  it("labels a negative figure explicitly as withdrawal capacity, not a plain (misleading) contribution", () => {
    const result: RequiredContribution = { requiredMonthlyContribution: -48, currentMonthlyContribution: 1_000 };
    const label = formatRequiredContributionLabel(result, targetGap, "USD");
    expect(label).toContain("Withdrawal capacity");
  });
});
