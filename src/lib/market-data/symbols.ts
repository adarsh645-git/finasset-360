// Precious-metal spot-price codes (Finnhub has no concept of these; the
// metals providers key on them the same way a stock provider keys on a
// ticker). A Holding's `price_lookup_symbol` is otherwise free text, so
// this fixed set — rather than a per-Holding "which provider" flag — is
// what routes a symbol to the metals providers instead of Finnhub. Anything
// not in this set is assumed to be a stock/ETF ticker.
const METAL_SYMBOLS = new Set(["XAU", "XAG", "XPT", "XPD"]);

export function isMetalSymbol(symbol: string): boolean {
  return METAL_SYMBOLS.has(symbol.toUpperCase());
}
