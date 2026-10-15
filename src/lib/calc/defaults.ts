import type { Country } from "./types";

export type AssetClassId =
  | "real-estate"
  | "stocks"
  | "cash"
  | "crypto"
  | "metals"
  | "vehicles-and-other";

export type AssetClassDef = {
  id: AssetClassId;
  name: string;
  /** "country": the rate is set per Country. "shared": one rate for both. */
  rateScope: "country" | "shared";
};

export const ASSET_CLASSES: readonly AssetClassDef[] = [
  { id: "real-estate", name: "Real estate", rateScope: "country" },
  { id: "stocks", name: "Stocks", rateScope: "country" },
  { id: "cash", name: "Cash", rateScope: "country" },
  { id: "crypto", name: "Crypto", rateScope: "shared" },
  { id: "metals", name: "Metals", rateScope: "shared" },
  { id: "vehicles-and-other", name: "Vehicles & other", rateScope: "shared" },
];

export const COUNTRY_DEFAULTS = {
  US: { inflation: 0.03, realEstate: 0.04, stocks: 0.07, cash: 0.035 },
  India: { inflation: 0.05, realEstate: 0.06, stocks: 0.11, cash: 0.065 },
} as const satisfies Record<Country, unknown>;

export const SHARED_DEFAULTS = {
  crypto: 0.05,
  metals: 0.04,
  vehiclesAndOther: -0.09,
} as const;

export const DEFAULT_HORIZON_YEARS = 10;
