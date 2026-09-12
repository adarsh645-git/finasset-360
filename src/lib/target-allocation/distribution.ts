import type { AssetClass, Holding, HoldingValuation } from "@/components/portfolio/types";

/** Each active Holding's latest home-currency value, summed into its own
 * Asset Class — the actual side of the dashboard's distribution bars and
 * the Target Allocation editor (docs/SPEC.md, user stories 52, 112). A
 * Holding with no recorded Valuation yet contributes nothing rather than
 * being skipped, so every Asset Class with Holdings still gets an entry. */
export function sumHoldingsByAssetClass(
  holdings: Holding[],
  latestByHolding: Map<string, HoldingValuation>,
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const holding of holdings) {
    const latest = latestByHolding.get(holding.id);
    const amount = latest ? latest.amount * latest.fx_rate_to_home : 0;
    totals.set(holding.asset_class_id, (totals.get(holding.asset_class_id) ?? 0) + amount);
  }
  return totals;
}

export type AssetClassDistributionRow = {
  assetClassId: string;
  assetClassName: string;
  actualAmount: number;
  actualPercent: number;
  targetPercent: number;
  /** Target minus actual, in home-currency money — positive means the
   * Asset Class is under its target and money needs to move in, negative
   * means it's over (user story 54: the money figure, not just the
   * percent). */
  gapAmount: number;
  gapPercent: number;
};

/** One row per Asset Class, in the order given — callers pass Asset Classes
 * already in tree order (docs/SPEC.md's "Bars are drawn in tree order, not
 * size order"), and this function never re-sorts them. An Asset Class
 * absent from `targetPercentByClass` has no Target Allocation row yet and
 * defaults to a zero target rather than being excluded. */
export function computeDistribution(
  assetClasses: AssetClass[],
  actualAmountByClass: Map<string, number>,
  targetPercentByClass: Map<string, number>,
): AssetClassDistributionRow[] {
  let totalHoldings = 0;
  for (const amount of actualAmountByClass.values()) {
    totalHoldings += amount;
  }

  return assetClasses.map((assetClass) => {
    const actualAmount = actualAmountByClass.get(assetClass.id) ?? 0;
    const targetPercent = targetPercentByClass.get(assetClass.id) ?? 0;
    const actualPercent = totalHoldings > 0 ? (actualAmount / totalHoldings) * 100 : 0;
    const targetAmount = (targetPercent / 100) * totalHoldings;

    return {
      assetClassId: assetClass.id,
      assetClassName: assetClass.name,
      actualAmount,
      actualPercent,
      targetPercent,
      gapAmount: targetAmount - actualAmount,
      gapPercent: targetPercent - actualPercent,
    };
  });
}
