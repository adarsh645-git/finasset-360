import type {
  AssetClassId,
  Country,
  CountryAssumptionsInput,
  ProjectionAssumptionsInput,
} from "./types";

/** The six fixed Asset Classes. `rateScope` says where the Projection rate
 * comes from: the Country, or one rate shared by both. */
export const ASSET_CLASSES: Record<
  AssetClassId,
  { name: string; rateScope: "country" | "shared"; sharedDefault?: number }
> = {
  realEstate: { name: "Real estate", rateScope: "country" },
  stocks: { name: "Stocks", rateScope: "country" },
  cash: { name: "Cash", rateScope: "country" },
  crypto: { name: "Crypto", rateScope: "shared", sharedDefault: 0.05 },
  metals: { name: "Metals", rateScope: "shared", sharedDefault: 0.04 },
  vehiclesOther: { name: "Vehicles & other", rateScope: "shared", sharedDefault: -0.09 },
};

export const COUNTRY_DEFAULTS: Record<Country, Required<Omit<CountryAssumptionsInput, "monthlySavings">>> = {
  US: { inflation: 0.03, realEstate: 0.04, stocks: 0.07, cash: 0.035 },
  IN: { inflation: 0.05, realEstate: 0.06, stocks: 0.11, cash: 0.065 },
};

export const DEFAULT_HORIZON_YEARS = 10;

export interface ResolvedCountryAssumptions {
  inflation: number;
  realEstate: number;
  stocks: number;
  cash: number;
  monthlySavings: number;
}

export interface ResolvedAssumptions {
  US: ResolvedCountryAssumptions;
  IN: ResolvedCountryAssumptions;
  crypto: number;
  metals: number;
  vehiclesOther: number;
  savingsGrowth: number;
  horizonYears: number;
}

function resolveCountry(country: Country, input: CountryAssumptionsInput = {}): ResolvedCountryAssumptions {
  const defaults = COUNTRY_DEFAULTS[country];
  return {
    inflation: input.inflation ?? defaults.inflation,
    realEstate: input.realEstate ?? defaults.realEstate,
    stocks: input.stocks ?? defaults.stocks,
    cash: input.cash ?? defaults.cash,
    monthlySavings: input.monthlySavings ?? 0,
  };
}

/** Blank (undefined) fields take their default; a filled-in 0 is kept. */
export function resolveAssumptions(input: ProjectionAssumptionsInput): ResolvedAssumptions {
  return {
    US: resolveCountry("US", input.US),
    IN: resolveCountry("IN", input.IN),
    crypto: input.crypto ?? ASSET_CLASSES.crypto.sharedDefault!,
    metals: input.metals ?? ASSET_CLASSES.metals.sharedDefault!,
    vehiclesOther: input.vehiclesOther ?? ASSET_CLASSES.vehiclesOther.sharedDefault!,
    savingsGrowth: input.savingsGrowth ?? 0,
    horizonYears: input.horizonYears ?? DEFAULT_HORIZON_YEARS,
  };
}
