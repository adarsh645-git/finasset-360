import type { SupabaseClient } from "@supabase/supabase-js";

// Frankfurter (ECB rates) — free, keyless, no rate limit documented. Chosen
// over the researched market-data providers (docs/SPEC.md's "Market data
// and the price cache" section) because those cover stock/metal *prices*
// only; FX conversion is a separate concern this ticket introduces.
const FX_API_URL = "https://api.frankfurter.dev/v1/latest";

/** Today's live rate from `from` to `to`, or `null` on any failure —
 * network error, non-2xx, or a response missing the requested rate — so
 * the caller can fall back rather than let one flaky request block
 * recording a Valuation. */
async function fetchLiveFxRate(from: string, to: string): Promise<number | null> {
  try {
    const response = await fetch(
      `${FX_API_URL}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    );
    if (!response.ok) return null;
    const body = (await response.json()) as { rates?: Record<string, unknown> };
    const rate = Number(body.rates?.[to]);
    return Number.isFinite(rate) ? rate : null;
  } catch {
    return null;
  }
}

/** This User's most recently recorded `fx_rate_to_home` for this exact
 * currency pair, across any of their Holdings — the fallback used only when
 * the live API is unreachable, so a provider outage never blocks recording
 * a Valuation. */
async function lastKnownFxRate(
  supabase: SupabaseClient,
  from: string,
  to: string,
): Promise<number | null> {
  const { data } = await supabase
    .from("holding_valuation")
    .select("fx_rate_to_home, holding:holding_id!inner(currency)")
    .eq("home_currency_at_recording", to)
    .eq("holding.currency", from)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const rate = Number(data?.fx_rate_to_home);
  return Number.isFinite(rate) ? rate : null;
}

/** The rate to convert an amount in `from` into `to`, captured at the
 * moment of recording (docs/SPEC.md, user story 26) — 1 when the two
 * currencies already match, otherwise today's live rate, falling back to
 * this User's own last recorded rate for the same pair if the live fetch
 * fails. `null` only when neither source has an answer, which the caller
 * surfaces as a 502 rather than recording a fabricated rate. */
export async function resolveFxRate(
  supabase: SupabaseClient,
  from: string,
  to: string,
): Promise<number | null> {
  if (from === to) return 1;
  const live = await fetchLiveFxRate(from, to);
  if (live !== null) return live;
  return lastKnownFxRate(supabase, from, to);
}
