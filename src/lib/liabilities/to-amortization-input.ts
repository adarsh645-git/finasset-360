import type { AmortizationInput } from "@/lib/projection/engine";
import type { Liability } from "@/components/portfolio/types";

/** Maps a `Liability` row's Amortization Assumption columns onto the
 * Projection engine's `AmortizationInput` shape — the one translation every
 * caller of `computeAmortizationSchedule`/`projectLiabilityBalance` needs,
 * so it isn't hand-assembled at each call site. `fxRate` converts every
 * dollar-valued field (not `interest_rate` or `term_months`, neither of
 * which is a currency amount) by the same rate a Liability's own balance
 * would be — pass it when netting into a home-currency figure (ticket 11);
 * default 1 for same-currency uses like a Liability's own payoff curve or a
 * linked Net Position, which read every side in its own currency. */
export function toAmortizationInput(liability: Liability, fxRate = 1): AmortizationInput {
  return {
    interest_rate: liability.interest_rate,
    original_loan_amount:
      liability.original_loan_amount === null ? null : liability.original_loan_amount * fxRate,
    term_months: liability.term_months,
    custom_monthly_payment:
      liability.custom_monthly_payment === null ? null : liability.custom_monthly_payment * fxRate,
    extra_monthly_payment: liability.extra_monthly_payment * fxRate,
    escrow_portion: liability.escrow_portion * fxRate,
  };
}
