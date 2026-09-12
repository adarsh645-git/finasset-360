import type { ProjectionAssumptions } from "@/components/portfolio/types";

export type ProjectionLiabilityInput = {
  id: string;
  /** Its latest recorded home-currency balance. Ticket 11 will add
   * Amortization Assumptions and amortize this forward; until then every
   * Liability is held exactly flat (docs/SPEC.md, user story 62) — the
   * Projection never invents a payoff schedule nobody entered. */
  currentAmount: number;
};

export type ProjectedNetWorthPoint = {
  /** ISO date, `today` plus `yearIndex` calendar years. */
  date: string;
  /** 0 at `today` (the Today seam), up to and including the horizon. */
  yearIndex: number;
  holdingsTotal: number;
  liabilitiesTotal: number;
  netWorth: number;
};

export type ProjectedAmountPoint = {
  date: string;
  yearIndex: number;
  amount: number;
};

/** Monthly-compounding future value of a lump sum plus an ordinary annuity,
 * contributions credited end-of-month (docs/SPEC.md's projection engine
 * section): `FV = P(1+r)^n + C·[((1+r)^n − 1) / r]`. Falls back to the
 * linear degenerate case at zero growth, where the annuity term's `/ r`
 * would divide by zero — the correct limit of that term as `r → 0` is
 * `C·n`, so this isn't an approximation. */
function futureValueOfSegment(
  principal: number,
  monthlyRate: number,
  months: number,
  monthlyContribution: number,
): number {
  if (months <= 0) return principal;
  if (monthlyRate === 0) return principal + monthlyContribution * months;

  const growth = Math.pow(1 + monthlyRate, months);
  return principal * growth + monthlyContribution * ((growth - 1) / monthlyRate);
}

/** `today` plus `years` calendar years, as an ISO date — used instead of
 * naive day-count math so a projection anchored on e.g. a leap-day today
 * still lands on a sensible calendar date each year. */
function addYears(today: string, years: number): string {
  const [year, month, day] = today.split("-").map(Number);
  return new Date(Date.UTC(year + years, month - 1, day)).toISOString().slice(0, 10);
}

/** One future-value point per year from 0 (today) through the horizon,
 * chaining one closed-form segment per year (docs/SPEC.md: "C is
 * piecewise-constant, not constant... a chain of closed-form segments
 * rather than one evaluation"). `contributionForYear` steps once per
 * segment, which is what lets the same chain serve both the escalating
 * portfolio contribution and the ad-hoc Holding case's flat zero. */
function chainAnnualSegments(
  principal: number,
  annualRate: number,
  horizonYears: number,
  contributionForYear: (yearIndex: number) => number,
): number[] {
  const monthlyRate = annualRate / 12;
  const totals = [principal];
  let runningTotal = principal;
  for (let year = 1; year <= horizonYears; year++) {
    runningTotal = futureValueOfSegment(runningTotal, monthlyRate, 12, contributionForYear(year));
    totals.push(runningTotal);
  }
  return totals;
}

/** The forward-looking half of Net Worth (user stories 67, 68, 70, 72, 73):
 * Holdings are grown by the assumption set with an escalating monthly
 * contribution, each Liability is held flat at its current balance, and the
 * two are netted at each future point — never a growth rate applied to an
 * already-netted figure (docs/SPEC.md's central decision for this engine).
 * Pure: no I/O, no database, no clock beyond the injected `today`. */
export function projectNetWorth({
  today,
  holdingsTotal,
  liabilities,
  assumptions,
}: {
  today: string;
  holdingsTotal: number;
  liabilities: ProjectionLiabilityInput[];
  assumptions: ProjectionAssumptions;
}): ProjectedNetWorthPoint[] {
  const horizonYears = Math.max(0, Math.trunc(assumptions.horizon_years));
  const holdingsSeries = chainAnnualSegments(
    holdingsTotal,
    assumptions.growth_rate,
    horizonYears,
    (yearIndex) =>
      assumptions.monthly_contribution *
      Math.pow(1 + assumptions.contribution_escalation_rate, yearIndex - 1),
  );
  const liabilitiesTotal = liabilities.reduce((sum, liability) => sum + liability.currentAmount, 0);

  return holdingsSeries.map((holdings, yearIndex) => ({
    date: addYears(today, yearIndex),
    yearIndex,
    holdingsTotal: holdings,
    liabilitiesTotal,
    netWorth: holdings - liabilitiesTotal,
  }));
}

/** A single Holding's own trajectory at the Portfolio's growth rate, with no
 * contribution allocated to it — contributions are portfolio-level (user
 * story 78), so this is the same segment chain with a permanently zero
 * contribution rather than a separate formula. */
export function projectHoldingValue({
  today,
  currentAmount,
  growthRate,
  horizonYears,
}: {
  today: string;
  currentAmount: number;
  growthRate: number;
  horizonYears: number;
}): ProjectedAmountPoint[] {
  const horizon = Math.max(0, Math.trunc(horizonYears));
  const series = chainAnnualSegments(currentAmount, growthRate, horizon, () => 0);
  return series.map((amount, yearIndex) => ({ date: addYears(today, yearIndex), yearIndex, amount }));
}
