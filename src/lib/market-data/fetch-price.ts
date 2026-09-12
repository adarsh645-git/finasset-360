import { fetchFinnhubPrice } from "./finnhub";
import { fetchMetalPrice } from "./metals";
import { isMetalSymbol } from "./symbols";
import type { PriceFetchResult } from "./types";

/** Routes a `price_lookup_symbol` to the provider that serves it — Finnhub
 * for stocks/ETFs, the metals providers for a recognized metal code
 * (docs/SPEC.md's "Market data and the price cache" section). The one call
 * the cron refresh route makes per symbol. */
export function fetchPrice(symbol: string): Promise<PriceFetchResult> {
  return isMetalSymbol(symbol) ? fetchMetalPrice(symbol) : fetchFinnhubPrice(symbol);
}
