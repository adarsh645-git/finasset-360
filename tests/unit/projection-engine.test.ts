import { describe, expect, it } from "vitest";
import {
  computeAmortizationSchedule,
  projectHoldingValue,
  projectLiabilityBalance,
  projectNetWorth,
  projectPayoffMarkers,
  type AmortizationInput,
  type ProjectionLiabilityInput,
} from "@/lib/projection/engine";
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

function amortization(overrides: Partial<AmortizationInput>): AmortizationInput {
  return {
    interest_rate: null,
    original_loan_amount: null,
    term_months: null,
    custom_monthly_payment: null,
    extra_monthly_payment: 0,
    escrow_portion: 0,
    ...overrides,
  };
}

function flatLiability(id: string, currentAmount: number): ProjectionLiabilityInput {
  return { id, currentAmount, amortization: null };
}

function amortizingLiability(
  id: string,
  currentAmount: number,
  overrides: Partial<AmortizationInput>,
): ProjectionLiabilityInput {
  return { id, currentAmount, amortization: amortization(overrides) };
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

/** An independent month-by-month amortization oracle for the mid-year-split
 * test below: walks a Liability's own balance down one month at a time and
 * reports the month it first reaches zero, and — separately — walks the
 * Holdings total forward crediting the escalating contribution plus the
 * freed payment from the month the Liability's simulated balance first
 * hits zero. This never calls `computeAmortizationSchedule` or
 * `projectNetWorth`, so it can't fail for the same reason the code under
 * test would. */
function simulateHoldingsWithPayoff({
  holdingsTotal,
  growthRate,
  monthlyContribution,
  contributionEscalationRate,
  horizonYears,
  liabilityBalance,
  liabilityMonthlyRate,
  liabilityPayment,
}: {
  holdingsTotal: number;
  growthRate: number;
  monthlyContribution: number;
  contributionEscalationRate: number;
  horizonYears: number;
  liabilityBalance: number;
  liabilityMonthlyRate: number;
  liabilityPayment: number;
}): number {
  const monthlyRate = growthRate / 12;
  let holdings = holdingsTotal;
  let liability = liabilityBalance;
  let paidOff = false;
  for (let month = 1; month <= horizonYears * 12; month++) {
    const yearIndex = Math.floor((month - 1) / 12);
    let contribution = monthlyContribution * Math.pow(1 + contributionEscalationRate, yearIndex);
    if (!paidOff) {
      liability = liability * (1 + liabilityMonthlyRate) - liabilityPayment;
      if (liability <= 0) {
        // The final, partial payment lands *this* month — the freed amount
        // already joins the contribution now, not starting next month
        // (user story 74; matches ceil(payoff_months) being this month).
        liability = 0;
        paidOff = true;
        contribution += liabilityPayment;
      }
    } else {
      contribution += liabilityPayment;
    }
    holdings = holdings * (1 + monthlyRate) + contribution;
  }
  return holdings;
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
      liabilities: [flatLiability("l1", 20_000), flatLiability("l2", 5_000)],
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
      liabilities: [flatLiability("l1", 40_000)],
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
      liabilities: [flatLiability("l1", 10_000)],
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

  // Ticket 11: Amortization Assumptions and payoff.

  it("amortizes a Liability's balance down instead of holding it flat, floored at zero", () => {
    const points = projectNetWorth({
      today: "2026-01-01",
      holdingsTotal: 0,
      liabilities: [
        amortizingLiability("mortgage", 200_000, {
          interest_rate: 0.06,
          original_loan_amount: 200_000,
          term_months: 24,
        }),
      ],
      assumptions: assumptions({ horizon_years: 5, monthly_contribution: 0 }),
    });

    // A 24-month loan is fully amortized well before year 2, and stays at
    // zero — never negative, never resuming — for the rest of the horizon.
    expect(points[0].liabilitiesTotal).toBe(200_000);
    expect(points[1].liabilitiesTotal).toBeGreaterThan(0);
    expect(points[1].liabilitiesTotal).toBeLessThan(200_000);
    expect(points[2].liabilitiesTotal).toBe(0);
    expect(points[3].liabilitiesTotal).toBe(0);
    expect(points[5].liabilitiesTotal).toBe(0);
  });

  it("setting extra_monthly_payment moves the projected Net Worth line (sensitivity, not just value)", () => {
    const build = (extraMonthlyPayment: number) =>
      projectNetWorth({
        today: "2026-01-01",
        holdingsTotal: 100_000,
        liabilities: [
          amortizingLiability("loan", 200_000, {
            interest_rate: 0.06,
            original_loan_amount: 200_000,
            term_months: 180,
            extra_monthly_payment: extraMonthlyPayment,
          }),
        ],
        assumptions: assumptions({ growth_rate: 0.05, monthly_contribution: 0, horizon_years: 20 }),
      });

    const withoutExtra = build(0);
    const withExtra = build(500);

    const last = (points: ReturnType<typeof build>) => points[points.length - 1];

    // A naive "grow the already-netted figure" reading would move both
    // lines by the same growth factor regardless of extra_monthly_payment,
    // since the extra payment only ever appears inside the Liability-side
    // math. Asserting a genuine difference — not merely that either number
    // "looks right" — is what would have caught that rejected reading.
    expect(last(withExtra).netWorth).toBeGreaterThan(last(withoutExtra).netWorth);
    expect(last(withExtra).liabilitiesTotal).toBeLessThanOrEqual(last(withoutExtra).liabilitiesTotal);
  });

  it("escrow_portion changes the redirect but not the payoff date", () => {
    const buildLiability = (escrowPortion: number) =>
      amortizingLiability("loan", 50_000, {
        interest_rate: 0.06,
        original_loan_amount: 50_000,
        term_months: 24,
        escrow_portion: escrowPortion,
      });

    const noEscrow = computeAmortizationSchedule(50_000, buildLiability(0).amortization);
    const withEscrow = computeAmortizationSchedule(50_000, buildLiability(400).amortization);

    expect(noEscrow?.payoffMonths).toBeCloseTo(withEscrow!.payoffMonths, 9);
    expect(withEscrow!.freedAmount).toBeCloseTo(noEscrow!.freedAmount - 400, 9);

    // The escrow subtraction must actually reach the projection: two
    // otherwise-identical portfolios paying different escrow diverge in Net
    // Worth once the loan pays off and the (different) freed amounts join
    // the contribution.
    const project = (escrowPortion: number) =>
      projectNetWorth({
        today: "2026-01-01",
        holdingsTotal: 0,
        liabilities: [buildLiability(escrowPortion)],
        assumptions: assumptions({ growth_rate: 0.05, monthly_contribution: 0, horizon_years: 10 }),
      });

    const lastNoEscrow = project(0).at(-1)!;
    const lastWithEscrow = project(400).at(-1)!;
    expect(lastNoEscrow.holdingsTotal).toBeGreaterThan(lastWithEscrow.holdingsTotal);
    // Both loans still finish on the same month, so the (flat, zero)
    // Liability balance is identical at every year mark.
    expect(lastNoEscrow.liabilitiesTotal).toBe(lastWithEscrow.liabilitiesTotal);
  });

  it("the redirect begins at ceil(payoff_months), not before", () => {
    // r = 0 and a $100 payment against $1,250 pays off at exactly month
    // 12.5 — a genuinely fractional payoff, not a coincidence of rounding.
    const liability = amortizingLiability("loan", 1_250, {
      interest_rate: 0,
      custom_monthly_payment: 100,
    });
    const schedule = computeAmortizationSchedule(1_250, liability.amortization)!;
    expect(schedule.payoffMonths).toBeCloseTo(12.5, 9);

    const [marker] = projectPayoffMarkers({ liabilities: [liability], today: "2026-01-01", horizonYears: 2 });
    // ceil(12.5) = 13, not 12 — the redirect waits for the final partial
    // payment to land rather than firing on the last whole month.
    expect(marker.monthsFromToday).toBe(13);

    // The holdings chain must actually honor that: with zero growth and no
    // base contribution, Net Worth sits still until the redirect lands, so
    // by year 1 (month 12, one month *before* the redirect) no freed money
    // has joined yet, but by year 2 (month 24, well after) all of it has.
    const points = projectNetWorth({
      today: "2026-01-01",
      holdingsTotal: 0,
      liabilities: [liability],
      assumptions: assumptions({ growth_rate: 0, monthly_contribution: 0, horizon_years: 2 }),
    });
    expect(points[1].holdingsTotal).toBe(0);
    expect(points[2].holdingsTotal).toBeCloseTo(100 * (24 - 13 + 1), 9);
  });

  it("a payoff landing mid-escalation-year splits that year into two segments, matching an independent month-by-month simulation", () => {
    const holdingsTotal = 50_000;
    const growthRate = 0.06;
    const monthlyContribution = 800;
    const contributionEscalationRate = 0.05;
    const horizonYears = 4;

    // The current recorded balance (12,000) is already below the original
    // loan amount (15,000) — some payments predate this projection — which
    // is exactly what guarantees a payoff that lands on a fractional month
    // rather than coinciding with the loan's own round term, and separately
    // exercises "amortizes forward from the current balance, not the
    // original amount" (docs/SPEC.md).
    const liabilityBalance = 12_000;
    const liabilityRate = 0.08;
    const liability = amortizingLiability("car-loan", liabilityBalance, {
      interest_rate: liabilityRate,
      original_loan_amount: 15_000,
      term_months: 24,
    });
    const schedule = computeAmortizationSchedule(liabilityBalance, liability.amortization)!;
    expect(schedule.payoffMonths % 12).not.toBe(0);
    expect(schedule.payoffMonths).toBeLessThan(horizonYears * 12);
    expect(schedule.payoffMonths).toBeGreaterThan(12); // lands mid-way through year 2

    const points = projectNetWorth({
      today: "2026-01-01",
      holdingsTotal,
      liabilities: [liability],
      assumptions: assumptions({
        growth_rate: growthRate,
        monthly_contribution: monthlyContribution,
        contribution_escalation_rate: contributionEscalationRate,
        horizon_years: horizonYears,
      }),
    });

    const expected = simulateHoldingsWithPayoff({
      holdingsTotal,
      growthRate,
      monthlyContribution,
      contributionEscalationRate,
      horizonYears,
      liabilityBalance,
      liabilityMonthlyRate: liabilityRate / 12,
      liabilityPayment: schedule.payment,
    });

    const last = points[points.length - 1];
    expect(last.holdingsTotal / expected).toBeCloseTo(1, 7);
  });
});

describe("computeAmortizationSchedule", () => {
  it("returns null for a Liability with no Amortization Assumptions", () => {
    expect(computeAmortizationSchedule(10_000, null)).toBeNull();
    expect(computeAmortizationSchedule(10_000, amortization({}))).toBeNull();
  });

  it("returns null when there's no way to derive a payment (no custom payment, no amount+term)", () => {
    expect(computeAmortizationSchedule(10_000, amortization({ interest_rate: 0.06 }))).toBeNull();
    expect(
      computeAmortizationSchedule(10_000, amortization({ interest_rate: 0.06, term_months: 24 })),
    ).toBeNull();
  });

  it("uses custom_monthly_payment over the derived payment when both are available", () => {
    const schedule = computeAmortizationSchedule(
      10_000,
      amortization({
        interest_rate: 0.06,
        original_loan_amount: 10_000,
        term_months: 12,
        custom_monthly_payment: 900,
      }),
    )!;
    expect(schedule.payment).toBe(900);
  });

  it("adds extra_monthly_payment on top of the payment either way", () => {
    const derived = computeAmortizationSchedule(
      10_000,
      amortization({ interest_rate: 0.06, original_loan_amount: 10_000, term_months: 12 }),
    )!;
    const withExtra = computeAmortizationSchedule(
      10_000,
      amortization({
        interest_rate: 0.06,
        original_loan_amount: 10_000,
        term_months: 12,
        extra_monthly_payment: 50,
      }),
    )!;
    expect(withExtra.payment).toBeCloseTo(derived.payment + 50, 9);
  });

  it("flags a payment that doesn't cover interest as never paying off (Payment <= P0*r)", () => {
    const schedule = computeAmortizationSchedule(
      100_000,
      amortization({ interest_rate: 0.06, custom_monthly_payment: 400 }), // P0*r = 500/mo
    )!;
    expect(schedule.payoffMonths).toBe(Infinity);
    expect(schedule.balanceAtMonths(600)).toBeGreaterThan(100_000);
  });

  it("handles a zero interest rate as a linear payoff", () => {
    const schedule = computeAmortizationSchedule(
      1200,
      amortization({ interest_rate: 0, custom_monthly_payment: 100 }),
    )!;
    expect(schedule.payoffMonths).toBeCloseTo(12, 9);
    expect(schedule.balanceAtMonths(6)).toBeCloseTo(600, 9);
    expect(schedule.balanceAtMonths(12)).toBe(0);
  });
});

describe("projectLiabilityBalance", () => {
  it("holds a Liability with no Amortization Assumptions flat, mirroring projectHoldingValue's shape", () => {
    const points = projectLiabilityBalance({
      today: "2026-01-01",
      currentAmount: 15_000,
      amortization: null,
      horizonYears: 3,
    });
    expect(points.map((p) => p.amount)).toEqual([15_000, 15_000, 15_000, 15_000]);
  });

  it("traces an amortizing Liability's balance down to (and staying at) zero", () => {
    const points = projectLiabilityBalance({
      today: "2026-01-01",
      currentAmount: 10_000,
      amortization: amortization({ interest_rate: 0, custom_monthly_payment: 10_000 / 12 }),
      horizonYears: 2,
    });
    expect(points[0].amount).toBeCloseTo(10_000, 6);
    expect(points[1].amount).toBeCloseTo(0, 6);
    expect(points[2].amount).toBe(0);
  });
});

describe("projectPayoffMarkers", () => {
  it("emits one marker per amortizing Liability that pays off inside the horizon", () => {
    const markers = projectPayoffMarkers({
      today: "2026-01-01",
      horizonYears: 5,
      liabilities: [
        flatLiability("flat", 5_000),
        amortizingLiability("payoff-inside", 10_000, {
          interest_rate: 0.06,
          original_loan_amount: 10_000,
          term_months: 24,
        }),
        amortizingLiability("payoff-outside", 10_000, {
          interest_rate: 0.06,
          original_loan_amount: 10_000,
          term_months: 360,
        }),
      ],
    });

    expect(markers.map((m) => m.liabilityId)).toEqual(["payoff-inside"]);
    expect(markers[0].freedAmount).toBeGreaterThan(0);
    expect(markers[0].date > "2026-01-01").toBe(true);
  });

  it("omits a Liability whose payment never covers interest", () => {
    const markers = projectPayoffMarkers({
      today: "2026-01-01",
      horizonYears: 30,
      liabilities: [amortizingLiability("underpaid", 100_000, { interest_rate: 0.06, custom_monthly_payment: 100 })],
    });
    expect(markers).toEqual([]);
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
