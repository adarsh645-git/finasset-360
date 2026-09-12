// The outcome of one provider fetch for one symbol — a discriminated union
// rather than `null`-on-failure, because the cron route needs the failure
// *reason* to record as `price_cache.last_error`, not just the fact that it
// failed.
export type PriceFetchResult =
  | { ok: true; price: number; priceCurrency: string; source: string }
  | { ok: false; error: string };
