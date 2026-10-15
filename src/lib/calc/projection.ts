import { resolveAssumptions } from "./assumptions";
import { ASSET_CLASSES, type AssetClassId } from "./defaults";
import type {
  Country,
  CountryRollup,
  HoldingSeries,
  LiabilitySeries,
  Projection,
  ProjectionAssumptions,
  ProjectionHolding,
  ProjectionInput,
  ProjectionLiability,
  SavingsSeries,
} from "./types";

const MONTHS_PER_YEAR = 12;
/** A Liability that isn't paid off within 60 years is Not on track. */
const MAX_PAYOFF_MONTHS = 720;

const usdPerNative = (country: Country, fxRate: number) =>
  country === "India" ? 1 / fxRate : 1;

/** The balance after one month of interest and one payment, never below 0. */
const nextBalance = (balance: number, apr: number, payment: number) =>
  Math.max(0, balance * (1 + apr / MONTHS_PER_YEAR) - payment);

function sumByMonth(
  series: readonly { usd: number[] }[],
  months: number,
): number[] {
  return Array.from({ length: months + 1 }, (_, k) =>
    series.reduce((sum, s) => sum + s.usd[k], 0),
  );
}

/** The annual rate for a Holding's Asset Class: per Country, or shared. */
function annualRate(
  a: ProjectionAssumptions,
  { country, assetClass }: ProjectionHolding,
): number {
  const rates: Record<AssetClassId, number> = {
    "real-estate": a.countries[country].realEstate,
    stocks: a.countries[country].stocks,
    cash: a.countries[country].cash,
    crypto: a.shared.crypto,
    metals: a.shared.metals,
    "vehicles-and-other": a.shared.vehiclesAndOther,
  };
  return rates[assetClass];
}

function projectHolding(
  holding: ProjectionHolding,
  rate: number,
  months: number,
  fxRate: number,
): HoldingSeries {
  const native = Array.from(
    { length: months + 1 },
    (_, k) => holding.currentValue * (1 + rate) ** (k / MONTHS_PER_YEAR),
  );
  const toUsd = usdPerNative(holding.country, fxRate);
  return { id: holding.id, native, usd: native.map((v) => v * toUsd) };
}

/**
 * Walks the balance month by month until it reaches 0, past the horizon if need
 * be, to find the payoff month and the interest paid on the way. Undefined when
 * Not on track: the payment doesn't cover the interest, or payoff takes over
 * 720 months.
 */
function findPayoff({ balance, apr, monthlyPayment }: ProjectionLiability) {
  if (balance <= 0) return { payoffMonth: 0, interestRemaining: 0 };
  if (monthlyPayment <= (balance * apr) / MONTHS_PER_YEAR) return undefined;
  let b = balance;
  let interest = 0;
  for (let month = 1; month <= MAX_PAYOFF_MONTHS; month++) {
    interest += (b * apr) / MONTHS_PER_YEAR;
    b = nextBalance(b, apr, monthlyPayment);
    if (b === 0) return { payoffMonth: month, interestRemaining: interest };
  }
  return undefined;
}

function projectLiability(
  liability: ProjectionLiability,
  months: number,
  fxRate: number,
): LiabilitySeries {
  const native = [liability.balance];
  for (let k = 1; k <= months; k++) {
    native.push(
      nextBalance(native[k - 1], liability.apr, liability.monthlyPayment),
    );
  }
  const toUsd = usdPerNative(liability.country, fxRate);
  const payoff = findPayoff(liability);
  return {
    id: liability.id,
    native,
    usd: native.map((v) => v * toUsd),
    notOnTrack: payoff === undefined,
    ...payoff,
  };
}

const COUNTRIES: readonly Country[] = ["US", "India"];

const zeros = (months: number) => new Array<number>(months + 1).fill(0);

const addInto = (target: number[], source: readonly number[]) =>
  source.forEach((v, k) => {
    target[k] += v;
  });

/**
 * One Country's savings pool: the stepped base plus the flat payments of its
 * paid-off Liabilities, added at the end of each month from month 1 and
 * compounding at the Country's Stocks rate.
 */
function projectSavings(
  country: Country,
  assumptions: ProjectionAssumptions,
  liabilities: readonly LiabilitySeries[],
  liabilityCountry: ReadonlyMap<
    string,
    { country: Country; monthlyPayment: number }
  >,
  months: number,
  fxRate: number,
): SavingsSeries {
  const { monthlySavings, stocks } = assumptions.countries[country];
  const growth = (1 + stocks) ** (1 / MONTHS_PER_YEAR);
  const freed = liabilities.flatMap((l) => {
    const info = liabilityCountry.get(l.id);
    return info?.country === country && l.payoffMonth !== undefined
      ? [{ payoffMonth: l.payoffMonth, payment: info.monthlyPayment }]
      : [];
  });
  const amount = zeros(months);
  const native = zeros(months);
  for (let k = 1; k <= months; k++) {
    const base =
      monthlySavings *
      (1 + assumptions.savingsGrowth) ** Math.floor((k - 1) / MONTHS_PER_YEAR);
    amount[k] =
      base + freed.reduce((s, f) => s + (f.payoffMonth < k ? f.payment : 0), 0);
    native[k] = native[k - 1] * growth + amount[k];
  }
  const toUsd = usdPerNative(country, fxRate);
  return { amount, native, usd: native.map((v) => v * toUsd) };
}

/** Month-by-month Projection from today over the horizon. */
export function project(input: ProjectionInput): Projection {
  const assumptions = resolveAssumptions(input.assumptions);
  const months = assumptions.horizonYears * MONTHS_PER_YEAR;
  const holdings = input.holdings.map((h) =>
    projectHolding(h, annualRate(assumptions, h), months, input.fxRate),
  );
  const liabilities = input.liabilities.map((l) =>
    projectLiability(l, months, input.fxRate),
  );
  const liabilityInfo = new Map(input.liabilities.map((l) => [l.id, l]));
  const savings = Object.fromEntries(
    COUNTRIES.map((c) => [
      c,
      projectSavings(
        c,
        assumptions,
        liabilities,
        liabilityInfo,
        months,
        input.fxRate,
      ),
    ]),
  ) as Record<Country, SavingsSeries>;

  const countryAssetClasses = Object.fromEntries(
    COUNTRIES.map((c) => [
      c,
      Object.fromEntries(
        ASSET_CLASSES.map((a) => [a.id, zeros(months)]),
      ) as Record<AssetClassId, number[]>,
    ]),
  ) as Record<Country, Record<AssetClassId, number[]>>;
  input.holdings.forEach((h, i) =>
    addInto(countryAssetClasses[h.country][h.assetClass], holdings[i].usd),
  );
  COUNTRIES.forEach((c) =>
    addInto(countryAssetClasses[c].stocks, savings[c].usd),
  );

  const assetClasses = Object.fromEntries(
    ASSET_CLASSES.map((a) => {
      const total = zeros(months);
      COUNTRIES.forEach((c) => addInto(total, countryAssetClasses[c][a.id]));
      return [a.id, total];
    }),
  ) as Record<AssetClassId, number[]>;

  const countries = Object.fromEntries(
    COUNTRIES.map((c) => {
      const assetsUsd = zeros(months);
      ASSET_CLASSES.forEach((a) =>
        addInto(assetsUsd, countryAssetClasses[c][a.id]),
      );
      const liabilitiesUsd = zeros(months);
      input.liabilities.forEach(
        (l, i) =>
          l.country === c && addInto(liabilitiesUsd, liabilities[i].usd),
      );
      return [
        c,
        {
          assetsUsd,
          liabilitiesUsd,
          savingsUsd: savings[c].usd,
          netUsd: assetsUsd.map((v, k) => v - liabilitiesUsd[k]),
        },
      ];
    }),
  ) as Record<Country, CountryRollup>;

  const totalHoldingsUsd = sumByMonth(holdings, months);
  const totalSavingsUsd = sumByMonth(Object.values(savings), months);
  const totalAssetsUsd = totalHoldingsUsd.map((v, k) => v + totalSavingsUsd[k]);
  const totalLiabilitiesUsd = sumByMonth(liabilities, months);
  const netWorthUsd = totalAssetsUsd.map(
    (assets, k) => assets - totalLiabilitiesUsd[k],
  );
  return {
    holdings,
    liabilities,
    savings,
    assetClasses,
    countryAssetClasses,
    countries,
    totalHoldingsUsd,
    totalSavingsUsd,
    totalAssetsUsd,
    totalLiabilitiesUsd,
    netWorthUsd,
  };
}
