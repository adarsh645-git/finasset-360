import { COUNTRY_DEFAULTS, DEFAULT_HORIZON_YEARS, SHARED_DEFAULTS } from "./defaults";
import type {
  Blank,
  Country,
  CountryAssumptions,
  CountryAssumptionsInput,
  ProjectionAssumptions,
  ProjectionAssumptionsInput,
} from "./types";

// `??` keeps a filled-in 0 and replaces only undefined/null (blank).
const orDefault = (value: Blank<number>, fallback: number): number => value ?? fallback;

function resolveCountry(country: Country, input: CountryAssumptionsInput = {}): CountryAssumptions {
  const defaults = COUNTRY_DEFAULTS[country];
  return {
    inflation: orDefault(input.inflation, defaults.inflation),
    realEstate: orDefault(input.realEstate, defaults.realEstate),
    stocks: orDefault(input.stocks, defaults.stocks),
    cash: orDefault(input.cash, defaults.cash),
    monthlySavings: orDefault(input.monthlySavings, 0),
  };
}

/** Resolve blank Projection Assumptions to their defaults. */
export function resolveAssumptions(input: ProjectionAssumptionsInput): ProjectionAssumptions {
  const shared = input.shared ?? {};
  return {
    countries: {
      US: resolveCountry("US", input.countries?.US),
      India: resolveCountry("India", input.countries?.India),
    },
    shared: {
      crypto: orDefault(shared.crypto, SHARED_DEFAULTS.crypto),
      metals: orDefault(shared.metals, SHARED_DEFAULTS.metals),
      vehiclesAndOther: orDefault(shared.vehiclesAndOther, SHARED_DEFAULTS.vehiclesAndOther),
    },
    savingsGrowth: orDefault(input.savingsGrowth, 0),
    horizonYears: orDefault(input.horizonYears, DEFAULT_HORIZON_YEARS),
  };
}
