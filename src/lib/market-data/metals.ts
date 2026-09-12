import { fetchJson } from "./fetch-json";
import type { PriceFetchResult } from "./types";

const METAL_FIELD: Record<string, string> = {
  XAU: "gold",
  XAG: "silver",
  XPT: "platinum",
  XPD: "palladium",
};

// Metals.Dev (primary) and MetalpriceAPI (fallback) — 100 free
// requests/month each, docs/SPEC.md's "Market data and the price cache"
// section. Both providers' pricing/ToS pages were JS-rendered SPAs that the
// research effort (.scratch/asset-tracker-spec/research/market-data-apis.md)
// could not fully read — this ticket's own checklist calls out re-checking
// those figures by hand before shipping to real users, which applies
// doubly to the exact request/response shapes below.

const METALS_DEV_URL = "https://api.metals.dev/v1/latest";

async function fetchMetalsDev(symbol: string): Promise<PriceFetchResult> {
  const apiKey = process.env.METALS_DEV_API_KEY;
  if (!apiKey) return { ok: false, error: "METALS_DEV_API_KEY is not configured." };

  const field = METAL_FIELD[symbol.toUpperCase()];
  if (!field) return { ok: false, error: `${symbol} is not a recognized metal symbol.` };

  const url = `${METALS_DEV_URL}?api_key=${apiKey}&currency=USD&unit=toz`;
  const result = await fetchJson(url, "Metals.Dev");
  if (!result.ok) return result;

  const price = Number((result.body as { metals?: Record<string, unknown> }).metals?.[field]);
  if (!Number.isFinite(price) || price <= 0) {
    return { ok: false, error: "Metals.Dev returned no usable price for this symbol." };
  }

  return { ok: true, price, priceCurrency: "USD", source: "metals.dev" };
}

const METALPRICE_API_URL = "https://api.metalpriceapi.com/v1/latest";

async function fetchMetalpriceApi(symbol: string): Promise<PriceFetchResult> {
  const apiKey = process.env.METALPRICE_API_KEY;
  if (!apiKey) return { ok: false, error: "METALPRICE_API_KEY is not configured." };

  const code = symbol.toUpperCase();

  const url = `${METALPRICE_API_URL}?api_key=${apiKey}&base=USD&currencies=${code}`;
  const result = await fetchJson(url, "MetalpriceAPI");
  if (!result.ok) return result;

  const rate = Number((result.body as { rates?: Record<string, unknown> }).rates?.[code]);
  // MetalpriceAPI models a metal as a "currency" against `base=USD`, so
  // `rates[code]` is how many ounces one USD buys, not the USD price of an
  // ounce — inverted here to get the figure `price_cache.price` expects.
  if (!Number.isFinite(rate) || rate <= 0) {
    return { ok: false, error: "MetalpriceAPI returned no usable rate for this symbol." };
  }

  return { ok: true, price: 1 / rate, priceCurrency: "USD", source: "metalpriceapi" };
}

/** Metals.Dev first, falling back to MetalpriceAPI only if it fails —
 * user story 38: one provider outage must not blank a Live Estimate that
 * the other provider can still serve. */
export async function fetchMetalPrice(symbol: string): Promise<PriceFetchResult> {
  const primary = await fetchMetalsDev(symbol);
  if (primary.ok) return primary;

  const fallback = await fetchMetalpriceApi(symbol);
  if (fallback.ok) return fallback;

  return { ok: false, error: `${primary.error} Fallback also failed: ${fallback.error}` };
}
