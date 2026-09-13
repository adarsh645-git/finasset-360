import type { ProjectionAssumptions } from "@/components/portfolio/types";

/** A Liability's optional Amortization Assumptions (ticket 11, user
 * stories 57–61): any Liability opts in by filling these in, never keyed to
 * a Liability Class. `extra_monthly_payment`/`escrow_portion` are always
 * present (defaulting to 0 at the schema layer, mirroring
 * `contribution_escalation_rate`); the rest are `null` until the User
 * enters them. */
export type AmortizationInput = {
  interest_rate: number | null;
  original_loan_amount: number | null;
  term_months: number | null;
  custom_monthly_payment: number | null;
  extra_monthly_payment: number;
  escrow_portion: number;
};

export type ProjectionLiabilityInput = {
  id: string;
  /** Its latest recorded home-currency balance — amortization runs forward
   * from *this*, not `original_loan_amount`, because manual Valuation
   * snapshots stay authoritative for "now" (docs/SPEC.md). */
  currentAmount: number;
  /** `null` (or incomplete) means held exactly flat (user story 62) — the
   * Projection never invents a payoff schedule nobody entered. */
  amortization: AmortizationInput | null;
};

export type ProjectedNetWorthPoint = {
  /** ISO date, `today` plus `yearIndex` calendar years. */
  date: string;
  /** 0 at `today` (the Today seam), up to and including the horizon. */
  yearIndex: number;
  holdingsTotal: number;
  liabilitiesTotal: number;
  netWorth: number;
  /** `netWorth` restated in today's purchasing power (see `deflate`) —
   * ticket 12's primary figure: headline figures read from this, `netWorth`
   * is the fainter reference. Equal to `netWorth` at `yearIndex` 0. */
  realNetWorth: number;
};

export type ProjectedAmountPoint = {
  date: string;
  yearIndex: number;
  amount: number;
};

export type AmortizationSchedule = {
  /** Annual `interest_rate` over 12. */
  monthlyRate: number;
  /** `custom_monthly_payment` when set, else the derived payment, plus
   * `extra_monthly_payment` either way — what the payoff formula runs on. */
  payment: number;
  /** `payment` minus `escrow_portion` — what joins the contribution once
   * the loan pays off (user stories 74, 75). */
  freedAmount: number;
  /** `Infinity` when `payment <= currentAmount * monthlyRate`: the same
   * condition the entry-time warning checks (user story 63), since a
   * payment that doesn't cover interest never reaches zero. */
  payoffMonths: number;
  /** The closed-form balance `months` out, floored at zero and staying
   * there past `payoffMonths`. */
  balanceAtMonths(months: number): number;
};

export type PayoffMarker = {
  liabilityId: string;
  /** `ceil(payoffMonths)` — the redirect boundary (user story 74: "the
   * loan isn't clear until the final partial payment lands"), not the
   * fractional month the closed form actually crosses zero. */
  monthsFromToday: number;
  date: string;
  freedAmount: number;
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

/** A nominal figure restated in today's purchasing power — ticket 12's
 * entire "real" side, applied once, at display time, never fed back into a
 * later calculation: `real(y) = nominal(y) / (1 + inflation)^y` (docs/SPEC.md).
 * Every rate the engine grows, escalates or amortizes by stays nominal;
 * this is the one divide applied last. `yearIndex` 0 always returns
 * `nominal` unchanged (deflator 1) — the fork point between the two lines,
 * not a restatement of recorded history, which this function never
 * touches. */
function deflate(nominal: number, inflationRate: number, yearIndex: number): number {
  return nominal / Math.pow(1 + inflationRate, yearIndex);
}

/** `today` plus `months`, as an ISO date — used instead of naive day-count
 * math so a projection anchored on e.g. a leap-day today still lands on a
 * sensible calendar date. */
function addMonths(today: string, months: number): string {
  const [year, month, day] = today.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + months, day)).toISOString().slice(0, 10);
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

/** An `AmortizationInput` with enough fields present to actually amortize —
 * narrows `interest_rate` to `number` so callers past the guard don't need
 * a second null check. */
type AmortizingInput = AmortizationInput & { interest_rate: number };

/** Whether a Liability has enough Amortization Assumptions to amortize
 * (user story 61: any Liability, not only a Mortgage) — an interest rate,
 * plus either a stated payment or the original amount and term to derive
 * one. Missing any of that, it stays held flat (user story 62). */
function hasAmortizationInputs(input: AmortizationInput | null): input is AmortizingInput {
  if (input === null || input.interest_rate === null) return false;
  return (
    input.custom_monthly_payment !== null ||
    (input.original_loan_amount !== null && input.term_months !== null)
  );
}

/** The standard fixed-payment amortization formula `M = L·[r(1+r)^t] /
 * [(1+r)^t − 1]`, with the `r → 0` limit (`L/t`) handled explicitly rather
 * than dividing by zero. */
function derivedMonthlyPayment(loanAmount: number, monthlyRate: number, termMonths: number): number {
  if (monthlyRate === 0) return loanAmount / termMonths;
  const growth = Math.pow(1 + monthlyRate, termMonths);
  return (loanAmount * monthlyRate * growth) / (growth - 1);
}

/** Builds a Liability's amortization schedule from its current recorded
 * balance — `null` if it doesn't opt in (see `hasAmortizationInputs`).
 * `payoffMonths` is `Infinity` when the payment doesn't cover interest,
 * which is deliberately the same comparison the entry-time warning needs
 * (docs/SPEC.md: "a validation concern at entry time, not a change to the
 * formula's shape") — callers reuse this rather than re-deriving it. */
export function computeAmortizationSchedule(
  currentAmount: number,
  input: AmortizationInput | null,
): AmortizationSchedule | null {
  if (!hasAmortizationInputs(input)) return null;

  const monthlyRate = input.interest_rate / 12;
  const basePayment =
    input.custom_monthly_payment ??
    derivedMonthlyPayment(input.original_loan_amount as number, monthlyRate, input.term_months as number);
  const payment = basePayment + input.extra_monthly_payment;
  const freedAmount = payment - input.escrow_portion;

  let payoffMonths: number;
  if (payment <= 0) {
    payoffMonths = Infinity;
  } else if (monthlyRate === 0) {
    payoffMonths = currentAmount / payment;
  } else {
    const denominator = payment - currentAmount * monthlyRate;
    payoffMonths = denominator <= 0 ? Infinity : Math.log(payment / denominator) / Math.log(1 + monthlyRate);
  }
  payoffMonths = Math.max(0, payoffMonths);

  function balanceAtMonths(months: number): number {
    if (months >= payoffMonths) return 0;
    if (monthlyRate === 0) return Math.max(0, currentAmount - payment * months);
    const growth = Math.pow(1 + monthlyRate, months);
    return Math.max(0, currentAmount * growth - payment * ((growth - 1) / monthlyRate));
  }

  return { monthlyRate, payment, freedAmount, payoffMonths, balanceAtMonths };
}

/** The Holdings-side chain (see `projectNetWorth`), generalized from a
 * once-a-year segment to one broken additionally at each Liability's
 * redirect boundary. Between any two consecutive breakpoints — a calendar
 * year or a redirect, in either order — the monthly contribution is
 * constant, so the segment chain stays closed-form throughout (docs/SPEC.md:
 * "a payoff landing mid-escalation-year simply splits that year into two
 * segments"). Reduces to `chainAnnualSegments`'s own escalation-only
 * schedule when no Liability amortizes. */
function chainHoldingsWithRedirects(
  principal: number,
  annualGrowthRate: number,
  horizonYears: number,
  baseMonthlyContribution: number,
  escalationRate: number,
  schedules: Array<AmortizationSchedule | null>,
): number[] {
  const horizonMonths = horizonYears * 12;
  const monthlyRate = annualGrowthRate / 12;

  // A Liability's freed payment joins the contribution starting exactly at
  // `ceil(payoffMonths)` (user story 74), so the segment *before* that must
  // end the month prior — one month earlier than the redirect itself. A
  // redirect that would start at month 1 or earlier has no prior month to
  // break at, so it's simply already redirecting from the very start.
  let freedFromStart = 0;
  const freedAtBreakpoint = new Map<number, number>();
  for (const schedule of schedules) {
    if (!schedule || schedule.payoffMonths === Infinity || schedule.payoffMonths > horizonMonths) continue;
    const segmentBoundary = Math.ceil(schedule.payoffMonths) - 1;
    if (segmentBoundary <= 0) {
      freedFromStart += schedule.freedAmount;
    } else {
      freedAtBreakpoint.set(segmentBoundary, (freedAtBreakpoint.get(segmentBoundary) ?? 0) + schedule.freedAmount);
    }
  }

  const yearBoundaries = Array.from({ length: horizonYears }, (_, i) => (i + 1) * 12);
  const breakpoints = [...new Set([...yearBoundaries, ...freedAtBreakpoint.keys()])]
    .filter((month) => month > 0 && month <= horizonMonths)
    .sort((a, b) => a - b);

  const totals = [principal];
  let runningTotal = principal;
  let freedAccum = freedFromStart;
  let previousMonth = 0;

  for (const breakpoint of breakpoints) {
    const yearOfSegment = Math.ceil(breakpoint / 12);
    const escalatedContribution = baseMonthlyContribution * Math.pow(1 + escalationRate, yearOfSegment - 1);
    runningTotal = futureValueOfSegment(
      runningTotal,
      monthlyRate,
      breakpoint - previousMonth,
      escalatedContribution + freedAccum,
    );

    if (breakpoint % 12 === 0) totals.push(runningTotal);

    freedAccum += freedAtBreakpoint.get(breakpoint) ?? 0;
    previousMonth = breakpoint;
  }

  return totals;
}

/** The forward-looking half of Net Worth (user stories 67, 68, 70, 72, 73):
 * Holdings are grown by the assumption set with an escalating monthly
 * contribution, each Liability is projected separately — amortized to
 * payoff when it has Amortization Assumptions, held flat otherwise — and
 * the two are netted at each future point, never a growth rate applied to
 * an already-netted figure. A paid-off Liability's freed payment (its
 * payment, including any extra, minus its escrow) joins the Holdings-side
 * contribution from `ceil(payoff_months)` on, always — there is no toggle
 * (user stories 74–77). Each point's `realNetWorth` is `netWorth` deflated
 * by `assumptions.inflation_rate` (ticket 12) — the only place inflation
 * enters this function; growth, escalation and amortization above all run
 * on nominal figures throughout. Pure: no I/O, no database, no clock beyond
 * the injected `today`. */
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
  const schedules = liabilities.map((liability) =>
    computeAmortizationSchedule(liability.currentAmount, liability.amortization),
  );

  const holdingsSeries = chainHoldingsWithRedirects(
    holdingsTotal,
    assumptions.growth_rate,
    horizonYears,
    assumptions.monthly_contribution,
    assumptions.contribution_escalation_rate,
    schedules,
  );

  return holdingsSeries.map((holdings, yearIndex) => {
    const liabilitiesTotal = liabilities.reduce((sum, liability, i) => {
      const schedule = schedules[i];
      const amount = schedule ? schedule.balanceAtMonths(yearIndex * 12) : liability.currentAmount;
      return sum + amount;
    }, 0);
    const netWorth = holdings - liabilitiesTotal;
    return {
      date: addMonths(today, yearIndex * 12),
      yearIndex,
      holdingsTotal: holdings,
      liabilitiesTotal,
      netWorth,
      realNetWorth: deflate(netWorth, assumptions.inflation_rate, yearIndex),
    };
  });
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
  return series.map((amount, yearIndex) => ({ date: addMonths(today, yearIndex * 12), yearIndex, amount }));
}

/** A single Liability's own balance trajectory (user story 66's payoff
 * curve) — flat at `currentAmount` without Amortization Assumptions,
 * otherwise `computeAmortizationSchedule`'s closed form sampled once a
 * year, mirroring `projectHoldingValue`'s shape. */
export function projectLiabilityBalance({
  today,
  currentAmount,
  amortization,
  horizonYears,
}: {
  today: string;
  currentAmount: number;
  amortization: AmortizationInput | null;
  horizonYears: number;
}): ProjectedAmountPoint[] {
  const horizon = Math.max(0, Math.trunc(horizonYears));
  const schedule = computeAmortizationSchedule(currentAmount, amortization);
  const points: ProjectedAmountPoint[] = [];
  for (let year = 0; year <= horizon; year++) {
    const months = year * 12;
    points.push({
      date: addMonths(today, months),
      yearIndex: year,
      amount: schedule ? schedule.balanceAtMonths(months) : currentAmount,
    });
  }
  return points;
}

/** One marker per amortizing Liability that pays off inside the horizon
 * (user story 76), at `ceil(payoff_months)` — the same redirect boundary
 * `projectNetWorth` steps the contribution at, so a marker's month always
 * agrees with the line it annotates. */
export function projectPayoffMarkers({
  liabilities,
  today,
  horizonYears,
}: {
  liabilities: ProjectionLiabilityInput[];
  today: string;
  horizonYears: number;
}): PayoffMarker[] {
  const horizonMonths = Math.max(0, Math.trunc(horizonYears)) * 12;
  const markers: PayoffMarker[] = [];
  for (const liability of liabilities) {
    const schedule = computeAmortizationSchedule(liability.currentAmount, liability.amortization);
    if (!schedule || schedule.payoffMonths === Infinity || schedule.payoffMonths > horizonMonths) continue;
    const monthsFromToday = Math.ceil(schedule.payoffMonths);
    markers.push({
      liabilityId: liability.id,
      monthsFromToday,
      date: addMonths(today, monthsFromToday),
      freedAmount: schedule.freedAmount,
    });
  }
  return markers;
}
