Type: build
Status: ready-for-agent

# 07: Live Estimates from a shared price cache

**What to build:** A Holding that tracks a market symbol shows a Live Estimate — quantity times the latest cached price — so the User can see roughly where it stands without looking anything up. It is labelled with how it differs from the last Valuation, and a one-click "use" records it as a Valuation. A Holding without a symbol (a house) simply has no Live Estimate.

The Live Estimate must read as clearly **not** a Valuation. A Valuation is always a deliberate, User-recorded snapshot; the Live Estimate is a convenience figure and is never persisted as one.

One shared server-side cached fetch serves every tenant. This is a hard requirement, not an optimisation — none of these free tiers survive N tenants polling independently.

Spec: [`docs/SPEC.md`](../../../docs/SPEC.md) — user stories 32–38.

**Blocked by:** 04. (The cron route can be exercised locally; ticket 02 is what puts it on a real schedule.)

- [ ] `price_lookup_symbol` and `quantity` on a Holding, populated together
- [ ] `price_cache` keyed by `symbol`, with `price`, `price_currency`, `source`, `last_error`, `fetched_at`
- [ ] No foreign key from `holding.price_lookup_symbol` into `price_cache` — the cache is global and independent of any tenant's data
- [ ] RLS **enabled** on `price_cache` with `FOR SELECT TO authenticated USING (true)` and no write policy for any client role; only the service-role key writes
- [ ] A Vercel Cron Job in `vercel.json` invokes a Next.js API route protected by the `CRON_SECRET` bearer token
- [ ] Finnhub for stocks and ETFs; Metals.Dev primary with MetalpriceAPI fallback for metals; keys server-side only
- [ ] Live Estimate shown as visually distinct from the recorded Valuation, labelled with the difference from the last Valuation
- [ ] Cached-price age is visible where freshness matters (once-daily refresh with ±59min slack must not read as real-time)
- [ ] One-click "use" records the Live Estimate as a Valuation
- [ ] Test: `price_cache` is readable by an authenticated client and **not writable by one**, including with a client-side key
- [ ] Test: the cron route rejects a request without the `CRON_SECRET` bearer token
- [ ] Test: a provider failure leaves the previous good price in place and records `last_error` **without touching `fetched_at`** — so `fetched_at` stays trustworthy as last *successful* fetch
- [ ] Before shipping to real users: check Finnhub's free-tier "personal, non-commercial" wording by hand, and the provider figures flagged lower-confidence in `research/market-data-apis.md`
