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
