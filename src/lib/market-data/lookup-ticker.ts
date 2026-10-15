import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchFinnhubName, fetchFinnhubPrice, fetchFinnhubSector } from "./finnhub";
import { sectorFromIndustry } from "./sector";
import { exchangeLabel } from "./ticker";

export type TickerLookup =
  | {
      known: true;
      ticker: string;
      name: string;
      sector: string;
      exchange: string | null;
      price: { amount: number; currency: string } | null;
    }
  | { known: false; ticker: string; name: string | null; exchange: string | null };

type SymbolRow = { name: string; mic: string | null; sector: string | null };

/** Previews a normalised ticker from shared market data, filling gaps from Finnhub and caching what it learns. `admin` is the service-role client: the shared tables are not writable by a User session. */
export async function lookupTicker(admin: SupabaseClient, ticker: string): Promise<TickerLookup> {
  const { data: symbol } = await admin
    .from("stock_symbol")
    .select("name, mic, sector")
    .eq("symbol", ticker)
    .maybeSingle<SymbolRow>();

  if (!symbol) {
    const found = await fetchFinnhubName(ticker);
    return {
      known: false,
      ticker,
      name: found.ok ? found.name : null,
      exchange: exchangeLabel(ticker, null),
    };
  }

  const [sector, price] = await Promise.all([
    symbol.sector ?? resolveAndStoreSector(admin, ticker),
    cachedOrFreshPrice(admin, ticker),
  ]);

  return {
    known: true,
    ticker,
    name: symbol.name,
    sector,
    exchange: exchangeLabel(ticker, symbol.mic),
    price,
  };
}

async function resolveAndStoreSector(admin: SupabaseClient, ticker: string): Promise<string> {
  const profile = await fetchFinnhubSector(ticker);
  // A failed lookup is not stored, so the next lookup retries instead of pinning Other.
  if (!profile.ok) return "Other";
  const sector = sectorFromIndustry(profile.sector);
  await admin.from("stock_symbol").update({ sector }).eq("symbol", ticker);
  return sector;
}

async function cachedOrFreshPrice(
  admin: SupabaseClient,
  ticker: string,
): Promise<{ amount: number; currency: string } | null> {
  const { data: cached } = await admin
    .from("price_cache")
    .select("price, currency")
    .eq("symbol", ticker)
    .maybeSingle();
  if (cached) return { amount: Number(cached.price), currency: cached.currency };

  const quote = await fetchFinnhubPrice(ticker);
  if (!quote.ok) return null;
  await admin.from("price_cache").upsert({
    symbol: ticker,
    price: quote.price,
    currency: quote.priceCurrency,
    fetched_at: new Date().toISOString(),
    last_error: null,
  });
  return { amount: quote.price, currency: quote.priceCurrency };
}
