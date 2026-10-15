import type { AssetClassId } from "./defaults";

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

/** One month of the nominal USD Net Worth series. `month` is `YYYY-MM`. */
export type NetWorthPoint = { month: string; netWorth: number };

export type GoalStatusInput = {
  /** Recorded history, then the Projection over the horizon. */
  series: readonly NetWorthPoint[];
  /** Index of today's month in `series`. */
  todayIndex: number;
  target: number;
  horizonYears: number;
};

export type GoalStatus = {
  status: "reached" | "projected" | "beyond";
  /** `YYYY-MM` of the first point at or above the target; absent when beyond. */
  month?: string;
  /** Negative when reached in the past; absent when beyond. */
  monthsFromToday?: number;
  /** The horizon N, set when beyond. */
  horizonYears?: number;
  /** Today's Net Worth over the target, clamped to 0 to 1. */
  progress: number;
};

export type Staleness = {
  /** Whole UTC calendar days since the user-entered figure; null when there is none. */
  ageDays: number | null;
  stale: boolean;
};

/** A Holding as the Projection sees it: its native current value. */
export type ProjectionHolding = {
  id: string;
  country: Country;
  assetClass: AssetClassId;
  currentValue: number;
};

export type ProjectionInput = {
  holdings: readonly ProjectionHolding[];
  assumptions: ProjectionAssumptionsInput;
  /** Today's FX Rate: INR per USD. Held flat for the whole Projection. */
  fxRate: number;
};

/** Monthly series, index k = month k, month 0 being today. */
export type HoldingSeries = { id: string; native: number[]; usd: number[] };

export type Projection = {
  holdings: HoldingSeries[];
  totalHoldingsUsd: number[];
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
