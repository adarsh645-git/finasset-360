import { formatMoney } from "@/lib/currency/format";
import { projectHoldingValue, projectLiabilityBalance, type AmortizationInput } from "./engine";

export type LinkedLiabilityInput = {
  currentAmount: number;
  amortization: AmortizationInput | null;
};

/** A linked pair's Projected Net Position (user stories 64–65): the
 * Holding's own trajectory minus its linked Liability's (or Liabilities' —
 * more than one loan can finance one Holding), at the same horizon, read
 * identically from either side of the link. Never called "equity" — that
 * collides with the Equity Asset Class (docs/SPEC.md). Assumes the pair
 * shares a currency, same as every other figure this app nets without an
 * fx conversion of its own. */
export function computeProjectedNetPosition({
  today,
  holdingCurrentAmount,
  holdingGrowthRate,
  linkedLiabilities,
  horizonYears,
}: {
  today: string;
  holdingCurrentAmount: number;
  holdingGrowthRate: number;
  linkedLiabilities: LinkedLiabilityInput[];
  horizonYears: number;
}): number {
  const holdingPoints = projectHoldingValue({
    today,
    currentAmount: holdingCurrentAmount,
    growthRate: holdingGrowthRate,
    horizonYears,
  });
  const holdingValue = holdingPoints[holdingPoints.length - 1].amount;

  const liabilitiesValue = linkedLiabilities.reduce((sum, liability) => {
    const points = projectLiabilityBalance({
      today,
      currentAmount: liability.currentAmount,
      amortization: liability.amortization,
      horizonYears,
    });
    return sum + points[points.length - 1].amount;
  }, 0);

  return holdingValue - liabilitiesValue;
}

/** "Projected Net Position with 123 Main St in 20 years: $145,000" — the
 * one sentence both `HoldingDetailPanel` and `LiabilityDetailPanel` render
 * for a linked pair, differing only in which side's name(s) they pass. */
export function formatNetPositionLabel(
  pairedWith: string,
  horizonYears: number,
  amount: number,
  currency: string,
): string {
  return `Projected Net Position with ${pairedWith} in ${horizonYears} years: ${formatMoney(amount, currency)}`;
}
