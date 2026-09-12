export type PriceCacheRow = {
  symbol: string;
  price: number;
  price_currency: string;
  source: string;
  last_error: string | null;
  fetched_at: string;
};

export type LiveEstimate = {
  amount: number;
  currency: string;
  fetchedAt: string;
  hasRecentFailure: boolean;
};

/** quantity × the latest cached price for a Holding's symbol (user story
 * 32) — `null` when no cache row exists yet for that symbol (never
 * fetched, or every fetch has failed since the row was created). */
export function computeLiveEstimate(
  quantity: number,
  priceCache: PriceCacheRow | null,
): LiveEstimate | null {
  if (!priceCache) return null;
  return {
    amount: quantity * priceCache.price,
    currency: priceCache.price_currency,
    fetchedAt: priceCache.fetched_at,
    hasRecentFailure: priceCache.last_error !== null,
  };
}

export type LiveEstimateComparison = { amount: number; percent: number | null } | null;

/** How the Live Estimate differs from the last recorded Valuation (user
 * story 34) — `null` when there's nothing to compare (no prior Valuation)
 * or the comparison would be meaningless (the cached price is quoted in a
 * different currency than the Holding's own Valuations — converting it
 * here would fabricate an FX rate this feature doesn't otherwise
 * capture). */
export function compareToLastValuation(
  liveEstimate: LiveEstimate,
  lastValuation: { amount: number } | null,
  holdingCurrency: string,
): LiveEstimateComparison {
  if (!lastValuation || liveEstimate.currency !== holdingCurrency) return null;
  const amount = liveEstimate.amount - lastValuation.amount;
  const percent = lastValuation.amount !== 0 ? (amount / lastValuation.amount) * 100 : null;
  return { amount, percent };
}

/** "updated 3 hours ago" / "updated 1 day ago" — hour-grained near the
 * boundary because the cron refresh is once-daily with ±59 minutes of
 * slack (docs/SPEC.md): a plain day-count would let a price fetched 23
 * hours ago read as "today", which is exactly the false
 * looks-real-time impression user story 37 exists to prevent. */
export function priceAgeLabel(fetchedAt: string, now: Date = new Date()): string {
  const ms = now.getTime() - new Date(fetchedAt).getTime();
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return "updated less than an hour ago";
  if (hours < 24) return `updated ${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `updated ${days} day${days === 1 ? "" : "s"} ago`;
}
