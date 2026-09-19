import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchPrice } from "./fetch-price";

export type PriceRefreshOutcome = { symbol: string; ok: boolean; error?: string };

/** Fetches one symbol and writes the outcome to `price_cache` — the single
 * per-symbol success/failure rule shared by the daily cron and
 * fetch-on-add (ticket 21). `admin` must be the service-role client: no
 * client role has a write policy on that table. */
export async function refreshPrice(
  admin: SupabaseClient,
  symbol: string,
): Promise<PriceRefreshOutcome> {
  const result = await fetchPrice(symbol);

  if (result.ok) {
    const { error } = await admin.from("price_cache").upsert(
      {
        symbol,
        price: result.price,
        price_currency: result.priceCurrency,
        source: result.source,
        last_error: null,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: "symbol" },
    );
    return { symbol, ok: !error, error: error?.message };
  }

  // A failure never touches `fetched_at` or `price` — the previous good
  // price stays in place (user story 38) and `fetched_at` stays
  // trustworthy as "last successful fetch". If no row exists yet for this
  // symbol (never fetched successfully), there is no price to preserve and
  // nothing to record the error against, so this is a no-op UPDATE rather
  // than an INSERT with a fabricated price.
  const { error } = await admin
    .from("price_cache")
    .update({ last_error: result.error })
    .eq("symbol", symbol);
  return { symbol, ok: false, error: error?.message ?? result.error };
}

/** Ticket 21: gives a newly tracked symbol its first price without waiting
 * for the next daily cron run. Only fills a hole — a symbol that already
 * has a `price_cache` row (the cron keeps it fresh for every tenant) is
 * left alone, so this stays one shared cache rather than a per-add fetch.
 *
 * Best-effort by design: the Holding is already saved by the time this
 * runs, so any failure here (provider down, unknown symbol, missing
 * service-role key) is swallowed — the Live Estimate just shows its "no
 * price yet" state until the cron succeeds. */
export async function ensurePriceCached(symbol: string | null | undefined): Promise<void> {
  if (!symbol) return;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("price_cache")
      .select("symbol")
      .eq("symbol", symbol)
      .maybeSingle();
    if (error || data) return;

    const outcome = await refreshPrice(admin, symbol);
    if (!outcome.ok) console.error(`Fetch-on-add for ${symbol} failed: ${outcome.error}`);
  } catch (error) {
    // Never fails the add — but logged, so a misconfigured deploy (e.g. a
    // missing service-role key) doesn't fail invisibly.
    console.error(`Fetch-on-add for ${symbol} threw:`, error);
  }
}
