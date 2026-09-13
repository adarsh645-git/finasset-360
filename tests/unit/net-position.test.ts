import { describe, expect, it } from "vitest";
import { computeProjectedNetPosition } from "@/lib/projection/net-position";

describe("computeProjectedNetPosition", () => {
  it("nets a Holding's own trajectory against its linked Liability's payoff curve", () => {
    const netPosition = computeProjectedNetPosition({
      today: "2026-01-01",
      holdingCurrentAmount: 400_000,
      holdingGrowthRate: 0.03,
      linkedLiabilities: [
        {
          currentAmount: 300_000,
          amortization: {
            interest_rate: 0.06,
            original_loan_amount: 300_000,
            term_months: 24,
            custom_monthly_payment: null,
            extra_monthly_payment: 0,
            escrow_portion: 0,
          },
        },
      ],
      horizonYears: 5,
    });

    // The loan is fully amortized well within 5 years, so the linked
    // Liability side contributes 0 by the horizon — Net Position is just
    // the House's own grown value.
    const houseAloneValue = 400_000 * Math.pow(1 + 0.03 / 12, 60);
    expect(netPosition).toBeCloseTo(houseAloneValue, 6);
  });

  it("sums more than one linked Liability against the same Holding", () => {
    const netPosition = computeProjectedNetPosition({
      today: "2026-01-01",
      holdingCurrentAmount: 100_000,
      holdingGrowthRate: 0,
      linkedLiabilities: [
        { currentAmount: 20_000, amortization: null },
        { currentAmount: 10_000, amortization: null },
      ],
      horizonYears: 3,
    });
    expect(netPosition).toBe(70_000);
  });
});
