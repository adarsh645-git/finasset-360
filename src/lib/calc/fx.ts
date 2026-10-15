import type { Country } from "./types";

/** INR per USD on a date (ISO yyyy-mm-dd). */
export interface FxRate {
  date: string;
  rate: number;
}

export interface FxLookup {
  rate: number;
  /** The stored date the rate came from, so a missed daily fetch is visible. */
  asOf: string;
}

/** The latest rate on or before `date`; a date before every rate uses the
 * earliest one (D8). ISO dates sort as strings. Needs at least one rate. */
export function lookupFxRate(rates: FxRate[], date: string): FxLookup {
  if (rates.length === 0)
    throw new Error("lookupFxRate needs at least one FX Rate");
  const sorted = [...rates].sort((a, b) => a.date.localeCompare(b.date));
  const onOrBefore = sorted.filter((r) => r.date <= date);
  const chosen =
    onOrBefore.length > 0 ? onOrBefore[onOrBefore.length - 1] : sorted[0];
  return { rate: chosen.rate, asOf: chosen.date };
}

/** A native amount in USD at `rate` (INR per USD); a US amount is unchanged. */
export function toUsd(native: number, country: Country, rate: number): number {
  return country === "IN" ? native / rate : native;
}
