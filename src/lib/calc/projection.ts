import { resolveAssumptions, type ResolvedAssumptions } from "./defaults";
import { toUsd } from "./fx";
import { ASSET_CLASS_IDS, COUNTRIES } from "./types";
import type { AssetClassId, Country, Holding, Liability, ProjectionAssumptionsInput } from "./types";

interface ProjectionInput {
  assumptions: ProjectionAssumptionsInput;
  /** Today's FX Rate: INR per USD. Held flat for the whole Projection. */
  fxRate: number;
}

export interface ProjectHoldingsInput extends ProjectionInput {
  holdings: Holding[];
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

function annualRate(assumptions: ResolvedAssumptions, country: Country, assetClass: AssetClassId): number {
  if (assetClass === "realEstate" || assetClass === "stocks" || assetClass === "cash") {
    return assumptions[country][assetClass];
  }
  return assumptions[assetClass];
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

export interface ProjectLiabilitiesInput extends ProjectionInput {
  liabilities: Liability[];
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

export interface ProjectPortfolioInput extends ProjectionInput {
  holdings: Holding[];
  liabilities: Liability[];
}

export interface SavingsSeries {
  /** Native amount added at the end of each month; index 0 is 0. */
  monthlyAmounts: number[];
  /** Native pool, compounding at the Country's Stocks rate. */
  nativePool: number[];
  usdPool: number[];
}

export interface CountryRollup {
  assetsUsd: number[];
  liabilitiesUsd: number[];
  savingsUsd: number[];
  netUsd: number[];
}

type ByAssetClass = Record<AssetClassId, number[]>;

export interface PortfolioProjection {
  holdings: HoldingsProjection;
  liabilities: LiabilitySeries[];
  /** Holdings plus savings minus Liabilities, USD, per month. */
  netWorthUsd: number[];
  savings: Record<Country, SavingsSeries>;
  totals: { assetsUsd: number[]; liabilitiesUsd: number[]; savingsUsd: number[] };
  /** USD per Asset Class; savings count in Stocks. */
  assetClassUsd: ByAssetClass;
  countryAssetClassUsd: Record<Country, ByAssetClass>;
  countries: Record<Country, CountryRollup>;
}

const zeros = (length: number): number[] => new Array<number>(length).fill(0);

function addInto(target: number[], source: number[]): void {
  source.forEach((value, k) => (target[k] += value));
}

function emptyByAssetClass(length: number): ByAssetClass {
  return Object.fromEntries(ASSET_CLASS_IDS.map((id) => [id, zeros(length)])) as ByAssetClass;
}

/** Base amount stepped up each year, plus each freed payment from the month after payoff, flat. */
function monthlyAmounts(
  base: number,
  savingsGrowth: number,
  freedPayments: { payoffMonth: number; payment: number }[],
  months: number,
): number[] {
  return Array.from({ length: months + 1 }, (_, k) => {
    if (k === 0) return 0;
    const stepped = base * (1 + savingsGrowth) ** Math.floor((k - 1) / 12);
    return freedPayments.reduce((sum, f) => (k > f.payoffMonth ? sum + f.payment : sum), stepped);
  });
}

function projectSavings(
  country: Country,
  liabilities: Liability[],
  liabilitySeries: LiabilitySeries[],
  resolved: ResolvedAssumptions,
  fxRate: number,
): SavingsSeries {
  const months = resolved.horizonYears * 12;
  const freedPayments = liabilities.flatMap((liability, i) =>
    liability.country === country && liabilitySeries[i].payoffMonth !== undefined
      ? [{ payoffMonth: liabilitySeries[i].payoffMonth!, payment: liability.monthlyPayment }]
      : [],
  );
  const amounts = monthlyAmounts(resolved[country].monthlySavings, resolved.savingsGrowth, freedPayments, months);
  const growth = (1 + resolved[country].stocks) ** (1 / 12);
  const nativePool = zeros(months + 1);
  for (let k = 1; k <= months; k++) nativePool[k] = nativePool[k - 1] * growth + amounts[k];
  return { monthlyAmounts: amounts, nativePool, usdPool: nativePool.map((v) => toUsd(v, country, fxRate)) };
}

/** Projects Holdings, Liabilities and savings, then rolls them up and nets them. */
export function projectPortfolio({ holdings, liabilities, assumptions, fxRate }: ProjectPortfolioInput): PortfolioProjection {
  const resolved = resolveAssumptions(assumptions);
  const length = resolved.horizonYears * 12 + 1;
  const holdingsProjection = projectHoldings({ holdings, assumptions, fxRate });
  const liabilitySeries = projectLiabilities({ liabilities, assumptions, fxRate });

  const savings = Object.fromEntries(
    COUNTRIES.map((c) => [c, projectSavings(c, liabilities, liabilitySeries, resolved, fxRate)]),
  ) as Record<Country, SavingsSeries>;

  const assetClassUsd = emptyByAssetClass(length);
  const countryAssetClassUsd = { US: emptyByAssetClass(length), IN: emptyByAssetClass(length) };
  const countries = Object.fromEntries(
    COUNTRIES.map((c): [Country, CountryRollup] => [
      c,
      { assetsUsd: zeros(length), liabilitiesUsd: zeros(length), savingsUsd: savings[c].usdPool, netUsd: zeros(length) },
    ]),
  ) as Record<Country, CountryRollup>;

  holdings.forEach((holding, i) => {
    const { usdValues } = holdingsProjection.holdings[i];
    addInto(assetClassUsd[holding.assetClass], usdValues);
    addInto(countryAssetClassUsd[holding.country][holding.assetClass], usdValues);
    addInto(countries[holding.country].assetsUsd, usdValues);
  });
  liabilities.forEach((liability, i) =>
    addInto(countries[liability.country].liabilitiesUsd, liabilitySeries[i].usdBalances),
  );

  const totals = { assetsUsd: zeros(length), liabilitiesUsd: zeros(length), savingsUsd: zeros(length) };
  for (const c of COUNTRIES) {
    addInto(assetClassUsd.stocks, savings[c].usdPool);
    addInto(countryAssetClassUsd[c].stocks, savings[c].usdPool);
    addInto(countries[c].assetsUsd, savings[c].usdPool);
    countries[c].assetsUsd.forEach((assets, k) => (countries[c].netUsd[k] = assets - countries[c].liabilitiesUsd[k]));
    addInto(totals.assetsUsd, countries[c].assetsUsd);
    addInto(totals.liabilitiesUsd, countries[c].liabilitiesUsd);
    addInto(totals.savingsUsd, savings[c].usdPool);
  }
  const netWorthUsd = totals.assetsUsd.map((assets, k) => assets - totals.liabilitiesUsd[k]);

  return {
    holdings: holdingsProjection,
    liabilities: liabilitySeries,
    netWorthUsd,
    savings,
    totals,
    assetClassUsd,
    countryAssetClassUsd,
    countries,
  };
}
