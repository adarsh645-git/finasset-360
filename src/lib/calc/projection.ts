import { resolveAssumptions, type ResolvedAssumptions } from "./defaults";
import type { AssetClassId, Country, Holding, Liability, ProjectionAssumptionsInput } from "./types";

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

/** A Liability that doesn't pay off within this many months is Not on track. */
const PAYOFF_LIMIT_MONTHS = 720;

export interface ProjectLiabilitiesInput {
  liabilities: Liability[];
  assumptions: ProjectionAssumptionsInput;
  fxRate: number;
}

export interface LiabilitySeries {
  id: string;
  /** Native balance, one point per month from month 0 to horizon x 12. */
  nativeBalances: number[];
  usdBalances: number[];
  notOnTrack: boolean;
  /** Absent when Not on track. May fall after the horizon. */
  payoffMonth?: number;
  /** Native currency, month 1 to payoff. Absent when Not on track. */
  interestRemaining?: number;
}

/** Each month b = max(0, b(1 + APR/12) - payment). Runs past the horizon to find the payoff. */
function amortize(liability: Liability, horizonMonths: number): Omit<LiabilitySeries, "id" | "usdBalances"> {
  const { balance, apr, monthlyPayment } = liability;
  const monthlyRate = apr / 12;
  const notOnTrackSeries = (): number[] => {
    const balances = [balance];
    for (let k = 1; k <= horizonMonths; k++) balances.push(balances[k - 1] * (1 + monthlyRate) - monthlyPayment);
    return balances;
  };

  if (balance > 0 && monthlyPayment <= balance * monthlyRate) {
    return { nativeBalances: notOnTrackSeries(), notOnTrack: true };
  }

  const balances = [balance];
  let interest = 0;
  let payoffMonth = balance > 0 ? undefined : 0;
  for (let k = 1; payoffMonth === undefined && k <= PAYOFF_LIMIT_MONTHS; k++) {
    const monthInterest = balances[k - 1] * monthlyRate;
    interest += monthInterest;
    balances.push(Math.max(0, balances[k - 1] + monthInterest - monthlyPayment));
    if (balances[k] === 0) payoffMonth = k;
  }
  if (payoffMonth === undefined) return { nativeBalances: notOnTrackSeries(), notOnTrack: true };

  while (balances.length <= horizonMonths) balances.push(0);
  return {
    nativeBalances: balances.slice(0, horizonMonths + 1),
    notOnTrack: false,
    payoffMonth,
    interestRemaining: interest,
  };
}

export function projectLiabilities({ liabilities, assumptions, fxRate }: ProjectLiabilitiesInput): LiabilitySeries[] {
  const months = resolveAssumptions(assumptions).horizonYears * 12;
  return liabilities.map((liability): LiabilitySeries => {
    const amortized = amortize(liability, months);
    const usdBalances = amortized.nativeBalances.map((native) => toUsd(native, liability.country, fxRate));
    return { id: liability.id, ...amortized, usdBalances };
  });
}

export interface ProjectPortfolioInput {
  holdings: Holding[];
  liabilities: Liability[];
  assumptions: ProjectionAssumptionsInput;
  fxRate: number;
}

export interface PortfolioProjection {
  holdings: HoldingsProjection;
  liabilities: LiabilitySeries[];
  /** Holdings minus Liabilities, USD, per month. */
  netWorthUsd: number[];
}

/** Projects Holdings and Liabilities separately, then nets them. */
export function projectPortfolio({ holdings, liabilities, assumptions, fxRate }: ProjectPortfolioInput): PortfolioProjection {
  const holdingsProjection = projectHoldings({ holdings, assumptions, fxRate });
  const liabilitySeries = projectLiabilities({ liabilities, assumptions, fxRate });
  const netWorthUsd = holdingsProjection.totalUsd.map(
    (assets, k) => assets - liabilitySeries.reduce((sum, l) => sum + l.usdBalances[k], 0),
  );
  return { holdings: holdingsProjection, liabilities: liabilitySeries, netWorthUsd };
}
