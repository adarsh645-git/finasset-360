import { resolveAssumptions } from "./assumptions";
import type { AssetClassId } from "./defaults";
import type {
  HoldingSeries,
  Projection,
  ProjectionAssumptions,
  ProjectionHolding,
  ProjectionInput,
} from "./types";

const MONTHS_PER_YEAR = 12;

/** The annual rate for a Holding's Asset Class: per Country, or shared. */
function annualRate(a: ProjectionAssumptions, { country, assetClass }: ProjectionHolding): number {
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
  const usdPerNative = holding.country === "India" ? 1 / fxRate : 1;
  return { id: holding.id, native, usd: native.map((v) => v * usdPerNative) };
}

/** Month-by-month Projection from today over the horizon. */
export function project(input: ProjectionInput): Projection {
  const assumptions = resolveAssumptions(input.assumptions);
  const months = assumptions.horizonYears * MONTHS_PER_YEAR;
  const holdings = input.holdings.map((h) =>
    projectHolding(h, annualRate(assumptions, h), months, input.fxRate),
  );
  const totalHoldingsUsd = Array.from({ length: months + 1 }, (_, k) =>
    holdings.reduce((sum, h) => sum + h.usd[k], 0),
  );
  return { holdings, totalHoldingsUsd };
}
