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

type LastKnownRate = { rate: number; recordedAt: string };

/** This User's most recently recorded `fx_rate_to_home` for this exact
 * currency pair, across any of their Holdings — one of two fallback sources
 * used only when the live API is unreachable, so a provider outage never
 * blocks recording a Valuation. */
async function lastKnownHoldingFxRate(
  supabase: SupabaseClient,
  from: string,
  to: string,
): Promise<LastKnownRate | null> {
  const { data } = await supabase
    .from("holding_valuation")
    .select("fx_rate_to_home, recorded_at, holding:holding_id!inner(currency)")
    .eq("home_currency_at_recording", to)
    .eq("holding.currency", from)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const rate = Number(data?.fx_rate_to_home);
  return Number.isFinite(rate) ? { rate, recordedAt: data!.recorded_at } : null;
}

/** Same fallback as `lastKnownHoldingFxRate`, across this User's Liabilities
 * instead — a Liability's currency may never have appeared on a Holding, so
 * recording a Liability balance needs its own fallback source too. */
async function lastKnownLiabilityFxRate(
  supabase: SupabaseClient,
  from: string,
  to: string,
): Promise<LastKnownRate | null> {
  const { data } = await supabase
    .from("liability_valuation")
    .select("fx_rate_to_home, recorded_at, liability:liability_id!inner(currency)")
    .eq("home_currency_at_recording", to)
    .eq("liability.currency", from)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const rate = Number(data?.fx_rate_to_home);
  return Number.isFinite(rate) ? { rate, recordedAt: data!.recorded_at } : null;
}

/** The more recent of the two fallback sources, or whichever one exists,
 * or `null` if neither has ever recorded this currency pair. */
async function lastKnownFxRate(
  supabase: SupabaseClient,
  from: string,
  to: string,
): Promise<number | null> {
  const [holdingRate, liabilityRate] = await Promise.all([
    lastKnownHoldingFxRate(supabase, from, to),
    lastKnownLiabilityFxRate(supabase, from, to),
  ]);

  if (holdingRate && liabilityRate) {
    return holdingRate.recordedAt >= liabilityRate.recordedAt ? holdingRate.rate : liabilityRate.rate;
  }
  return (holdingRate ?? liabilityRate)?.rate ?? null;
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
