import { fetchJson } from "./fetch-json";
import type { PriceFetchResult } from "./types";

const FINNHUB_QUOTE_URL = "https://finnhub.io/api/v1/quote";
const FINNHUB_SYMBOL_LIST_URL = "https://finnhub.io/api/v1/stock/symbol";
const FINNHUB_PROFILE_URL = "https://finnhub.io/api/v1/stock/profile2";

// Finnhub (docs/SPEC.md's "Market data and the price cache" section):
// real-time US-exchange quotes, 60 calls/min free, key server-side only.
// Its `/quote` response's current-price field is `c`; Finnhub doesn't
// report a currency on this endpoint, and its free tier is US-exchange
// data, so USD is the only currency this ever returns — documented here
// rather than guessed per-call.
export async function fetchFinnhubPrice(symbol: string): Promise<PriceFetchResult> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return { ok: false, error: "FINNHUB_API_KEY is not configured." };

  const url = `${FINNHUB_QUOTE_URL}?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`;
  const result = await fetchJson(url, "Finnhub");
  if (!result.ok) return result;

  const price = Number((result.body as { c?: unknown }).c);
  // Finnhub returns `c: 0` for an unrecognized symbol rather than an error
  // status, so a non-positive price is treated as "no data" and rejected
  // rather than cached as a real quote.
  if (!Number.isFinite(price) || price <= 0) {
    return { ok: false, error: "Finnhub returned no usable price for this symbol." };
  }

  return { ok: true, price, priceCurrency: "USD", source: "finnhub" };
}

export type FinnhubSymbolListing = { symbol: string; name: string; type: string };

export type FinnhubSymbolListResult =
  | { ok: true; symbols: FinnhubSymbolListing[] }
  | { ok: false; error: string };

// Ticket 18: Finnhub's bulk `/stock/symbol?exchange=US` endpoint — one call
// returns every US-exchange symbol (tens of thousands of rows), which is
// what the weekly refresh cron route upserts into `stock_symbol`. Its
// per-row company-name field is `description`, not `name`.
export async function fetchFinnhubSymbolList(): Promise<FinnhubSymbolListResult> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return { ok: false, error: "FINNHUB_API_KEY is not configured." };

  const url = `${FINNHUB_SYMBOL_LIST_URL}?exchange=US&token=${apiKey}`;
  const result = await fetchJson(url, "Finnhub");
  if (!result.ok) return result;

  if (!Array.isArray(result.body)) {
    return { ok: false, error: "Finnhub returned an unexpected symbol-list shape." };
  }

  const symbols = result.body
    .filter(
      (entry): entry is { symbol: string; description: string; type: string } =>
        typeof (entry as { symbol?: unknown })?.symbol === "string" &&
        typeof (entry as { description?: unknown })?.description === "string" &&
        typeof (entry as { type?: unknown })?.type === "string",
    )
    .map((entry) => ({ symbol: entry.symbol, name: entry.description, type: entry.type }));

  return { ok: true, symbols };
}

export type FinnhubSectorResult = { ok: true; sector: string | null } | { ok: false; error: string };

// Ticket 18: Finnhub's free-tier `/stock/profile2` has no real GICS sector
// field, only the coarser `finnhubIndustry` string — accepted as good
// enough since Sector is a display-only annotation, not a projection
// input. A blank/missing industry is a valid result (`sector: null`), not
// an error — the caller (the lazy sector-resolution route) is what decides
// how to cache "looked up, nothing there" distinctly from "never looked
// up".
export async function fetchFinnhubSector(symbol: string): Promise<FinnhubSectorResult> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return { ok: false, error: "FINNHUB_API_KEY is not configured." };

  const url = `${FINNHUB_PROFILE_URL}?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`;
  const result = await fetchJson(url, "Finnhub");
  if (!result.ok) return result;

  const industry = (result.body as { finnhubIndustry?: unknown }).finnhubIndustry;
  const sector = typeof industry === "string" && industry.trim().length > 0 ? industry.trim() : null;
  return { ok: true, sector };
}
