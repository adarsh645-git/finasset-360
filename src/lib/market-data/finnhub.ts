import { fetchJson } from "./fetch-json";
import type { PriceFetchResult } from "./types";

const FINNHUB_QUOTE_URL = "https://finnhub.io/api/v1/quote";

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
