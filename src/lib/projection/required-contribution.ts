import { formatMoney } from "@/lib/currency/format";
import type { ProjectionAssumptions } from "@/components/portfolio/types";
import { projectNetWorth, type ProjectionLiabilityInput } from "./engine";
import { formatTargetDateLabel, wholeCalendarYearsBetween, type TargetGap } from "./target-gap";

export type RequiredContribution = {
  /** The starting monthly contribution (escalation still applied on top,
   * per `assumptions.contribution_escalation_rate`) that lands the real
   * line on `targetAmount` at `targetDate`. Negative reads as withdrawal
   * capacity — the Portfolio alone clears the target. */
  requiredMonthlyContribution: number;
  currentMonthlyContribution: number;
};

/** Real Net Worth at `targetYearIndex`, holding every other assumption
 * fixed and swapping in `monthlyContribution` — the one probe
 * `computeRequiredContribution` needs twice to read off the line's slope,
 * since Liabilities amortize independently of the Holdings-side
 * contribution (docs/SPEC.md's projection engine section) and make real
 * Net Worth affine in the starting contribution. */
function realNetWorthAt(
  monthlyContribution: number,
  {
    today,
    holdingsTotal,
    liabilities,
    assumptions,
    targetYearIndex,
  }: {
    today: string;
    holdingsTotal: number;
    liabilities: ProjectionLiabilityInput[];
    assumptions: ProjectionAssumptions;
    targetYearIndex: number;
  },
): number {
  const points = projectNetWorth({
    today,
    holdingsTotal,
    liabilities,
    assumptions: { ...assumptions, monthly_contribution: monthlyContribution, horizon_years: targetYearIndex },
  });
  return points[targetYearIndex].realNetWorth;
}

/** The Required Contribution solver (ticket 14, user stories 91-95): the
 * starting monthly contribution that lands the **real** line on
 * `targetAmount` at `targetDate` — never the nominal one, since that is the
 * error the real-dollar decision (ticket 12) exists to prevent. Escalation
 * is held fixed at `assumptions.contribution_escalation_rate`; only the
 * starting figure is solved for (docs/SPEC.md: "a forecast about one's
 * future self rather than a lever anyone can pull").
 *
 * Real Net Worth at a fixed year is affine in the starting contribution —
 * Liability amortization schedules don't depend on it, and the annuity
 * term of `futureValueOfSegment` is linear in the monthly contribution — so
 * two probes (`0` and `1`) fix the line exactly and this is one subtract
 * and one divide, no iteration and no plausibility threshold. A negative
 * result is returned as-is (withdrawal capacity, still escalating) rather
 * than clamped. */
export function computeRequiredContribution({
  today,
  holdingsTotal,
  liabilities,
  assumptions,
  targetAmount,
  targetDate,
}: {
  today: string;
  holdingsTotal: number;
  liabilities: ProjectionLiabilityInput[];
  assumptions: ProjectionAssumptions;
  targetAmount: number;
  targetDate: string;
}): RequiredContribution {
  // Floored at 1, not 0 (unlike `computeTargetGap`'s own floor): a target
  // date this year or already passed leaves no full year of compounding
  // for a *monthly* contribution to act on, which would divide the zero
  // slope into `Infinity`/`NaN` — exactly what "never infinite or
  // undefined" (docs/SPEC.md) forbids. Solving against a one-year horizon
  // instead is the spec's own worked extreme case (457,517/mo, "absurd but
  // finite and positive"), not a new plausibility threshold.
  const targetYearIndex = Math.max(1, wholeCalendarYearsBetween(today, targetDate));
  const probeArgs = { today, holdingsTotal, liabilities, assumptions, targetYearIndex };

  const atZeroContribution = realNetWorthAt(0, probeArgs);
  const slope = realNetWorthAt(1, probeArgs) - atZeroContribution;

  return {
    requiredMonthlyContribution: (targetAmount - atZeroContribution) / slope,
    currentMonthlyContribution: assumptions.monthly_contribution,
  };
}

/** "You'd need 16,893/mo — or at your current 7,400/mo you reach it in
 * 2051 — 5 years late" (user stories 91-94): the required figure, always
 * paired with the achievable date at the User's *current* contribution
 * (`targetGap`, reused rather than resolved, so the two can never
 * disagree). Reads as headroom when the required figure is at or below
 * what's already contributed, and as explicitly-labelled withdrawal
 * capacity when negative — never clamped or suppressed. */
export function formatRequiredContributionLabel(
  result: RequiredContribution,
  targetGap: TargetGap,
  homeCurrency: string,
): string {
  const { requiredMonthlyContribution: required, currentMonthlyContribution: current } = result;
  const atCurrent = `at your current ${formatMoney(current, homeCurrency)}/mo you reach it in ${formatTargetDateLabel(targetGap)}`;

  if (required < 0) {
    return `Withdrawal capacity: ${formatMoney(-required, homeCurrency)}/mo — your Portfolio alone clears the target (${atCurrent})`;
  }
  if (required <= current) {
    return `${formatMoney(current - required, homeCurrency)}/mo of headroom — ${atCurrent}`;
  }
  return `You'd need ${formatMoney(required, homeCurrency)}/mo — or ${atCurrent}`;
}
