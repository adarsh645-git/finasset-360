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
