// Plain input types for the calculations module, in CONTEXT.md vocabulary.
// Nothing here imports from the old portfolio types; later tickets append
// their own types (Holding, Liability, Valuation, ...) to this file.

export const COUNTRIES = ["US", "IN"] as const;
export type Country = (typeof COUNTRIES)[number];

export const ASSET_CLASS_IDS = [
  "realEstate",
  "stocks",
  "cash",
  "crypto",
  "metals",
  "vehiclesOther",
] as const;
export type AssetClassId = (typeof ASSET_CLASS_IDS)[number];

/** A Country's Projection Assumptions as the User entered them. A missing
 * field is blank and resolves to its default; a present 0 is kept. */
export interface CountryAssumptionsInput {
  inflation?: number;
  realEstate?: number;
  stocks?: number;
  cash?: number;
  monthlySavings?: number;
}

export interface ProjectionAssumptionsInput {
  US?: CountryAssumptionsInput;
  IN?: CountryAssumptionsInput;
  crypto?: number;
  metals?: number;
  vehiclesOther?: number;
  savingsGrowth?: number;
  horizonYears?: number;
}

/** A Holding: a native-currency current value in one Country and Asset Class. */
export interface Holding {
  id: string;
  country: Country;
  assetClass: AssetClassId;
  value: number;
}

/** A Liability: an amortizing loan in one Country, in native currency. `apr`
 * is a fraction (0.06 = 6%). */
export interface Liability {
  id: string;
  country: Country;
  balance: number;
  apr: number;
  monthlyPayment: number;
}

/** A Stocks Position; the date is set only when its price is a Hand Price. */
export interface Position {
  handPriceDate: string | null;
}
