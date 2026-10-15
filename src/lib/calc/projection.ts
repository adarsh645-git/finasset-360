import { resolveAssumptions, type ResolvedAssumptions } from "./defaults";
import type { AssetClassId, Country, Holding, ProjectionAssumptionsInput } from "./types";

export interface ProjectHoldingsInput {
  holdings: Holding[];
  assumptions: ProjectionAssumptionsInput;
  /** Today's FX Rate: INR per USD. Held flat for the whole Projection. */
  fxRate: number;
}

export interface HoldingSeries {
  id: string;
  /** Native currency, one point per month from month 0 to horizon x 12. */
  nativeValues: number[];
  usdValues: number[];
}

export interface HoldingsProjection {
  holdings: HoldingSeries[];
  /** Sum of every Holding's USD value, per month. */
  totalUsd: number[];
}

const SHARED_RATE_KEY = {
  crypto: "crypto",
  metals: "metals",
  vehiclesOther: "vehiclesOther",
} as const;

function annualRate(assumptions: ResolvedAssumptions, country: Country, assetClass: AssetClassId): number {
  if (assetClass === "realEstate" || assetClass === "stocks" || assetClass === "cash") {
    return assumptions[country][assetClass];
  }
  return assumptions[SHARED_RATE_KEY[assetClass]];
}

function toUsd(native: number, country: Country, fxRate: number): number {
  return country === "IN" ? native / fxRate : native;
}

/** Compounds each Holding monthly as v x (1+r)^(k/12), FX flat at today's rate. */
export function projectHoldings({ holdings, assumptions, fxRate }: ProjectHoldingsInput): HoldingsProjection {
  const resolved = resolveAssumptions(assumptions);
  const months = resolved.horizonYears * 12;
  const totalUsd = new Array<number>(months + 1).fill(0);

  const series = holdings.map((holding): HoldingSeries => {
    const rate = annualRate(resolved, holding.country, holding.assetClass);
    const nativeValues = Array.from({ length: months + 1 }, (_, k) => holding.value * (1 + rate) ** (k / 12));
    const usdValues = nativeValues.map((native) => toUsd(native, holding.country, fxRate));
    usdValues.forEach((usd, k) => (totalUsd[k] += usd));
    return { id: holding.id, nativeValues, usdValues };
  });

  return { holdings: series, totalUsd };
}
