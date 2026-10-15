// Plain input types for the calculations module, in CONTEXT.md vocabulary.
// Rates are fractions (0.07 = 7%). Dates are `YYYY-MM-DD`. A blank
// Projection Assumption is `undefined` or `null`.

export type Country = "US" | "India";

export type Blank<T> = T | null | undefined;

export type CountryAssumptionsInput = {
  inflation?: Blank<number>;
  realEstate?: Blank<number>;
  stocks?: Blank<number>;
  cash?: Blank<number>;
  monthlySavings?: Blank<number>;
};

export type ProjectionAssumptionsInput = {
  countries?: Partial<Record<Country, CountryAssumptionsInput>>;
  shared?: {
    crypto?: Blank<number>;
    metals?: Blank<number>;
    vehiclesAndOther?: Blank<number>;
  };
  savingsGrowth?: Blank<number>;
  horizonYears?: Blank<number>;
};

export type CountryAssumptions = {
  inflation: number;
  realEstate: number;
  stocks: number;
  cash: number;
  monthlySavings: number;
};

export type ProjectionAssumptions = {
  countries: Record<Country, CountryAssumptions>;
  shared: { crypto: number; metals: number; vehiclesAndOther: number };
  savingsGrowth: number;
  horizonYears: number;
};

/** A dated Valuation. Only `user` ones count toward Stale. */
export type Valuation = {
  date: string;
  source: "user" | "auto";
};

/** A manually valued Holding, or a Liability. */
export type ManualItem = { kind: "manual"; valuations: readonly Valuation[] };

/** A Stocks Holding: only Positions with a Hand Price carry a user-entered date. */
export type StocksHolding = {
  kind: "stocks";
  positions: readonly { handPriceDate?: string }[];
};

export type StalenessInput = ManualItem | StocksHolding;

export type Staleness = {
  /** Whole UTC calendar days since the user-entered figure; null when there is none. */
  ageDays: number | null;
  stale: boolean;
};

/** A dated amount in the item's own currency (a Valuation, or a Liability balance). */
export type AmountValuation = { date: string; amount: number };

/** A Holding or Liability, as the history rule sees it. `currentValue` acts as
 * a Valuation dated today; `archivedOn` is the last day it counts. */
export type HistoryItem = {
  country: Country;
  valuations: readonly AmountValuation[];
  currentValue?: number;
  archivedOn?: string;
};

export type HistoryPortfolio = {
  holdings: readonly HistoryItem[];
  liabilities: readonly HistoryItem[];
};

/** INR per USD, stored on `date`. */
export type FxRate = { date: string; rate: number };

export type FxRateLookup = { rate: number; asOf: string };

/** USD change; `percent` is a fraction, absent when the base is 0. */
export type TwelveMonthChange = { amount: number; percent: number | undefined };
