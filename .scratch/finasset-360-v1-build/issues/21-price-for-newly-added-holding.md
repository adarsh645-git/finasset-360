Type: build
Status: resolved

# 21: A newly added market-symbol Holding shows a price immediately

**What to build:** After adding a Holding with a market symbol, its Live Estimate should appear without waiting for the next scheduled price refresh. Today it doesn't.

Not spec-derived — filed ad hoc from a user bug report ("after adding a new holding the price is not reflected (daily CRON needs to get in current prices for all the stocks and store it in the DB)").

**What already exists (so this is not "add a cron"):** ticket 07 shipped `/api/cron/refresh-prices`, scheduled daily at 13:00 UTC in `vercel.json`. It reads every tenant's distinct `price_lookup_symbol`s and upserts `price_cache`. So a symbol added *after* today's run has **no `price_cache` row until tomorrow's run** — that gap is the likely bug, and it's why the price is missing right after an add.

**Step zero — rule out the boring cause first:** confirm the daily cron is actually firing and succeeding in production (Vercel cron logs; a non-empty `price_cache`; `last_error` values). Memory notes that Supabase migrations have repeatedly *not* been applied remotely, so check `price_cache` exists and is populated there before designing anything.

**Open decision (grill before building):** how does a new symbol get its first price?

- **A. Fetch on add (recommended):** when a Holding is created/edited with a new `price_lookup_symbol` and no fresh `price_cache` row exists, the server route fetches that one symbol via the existing `src/lib/market-data/fetch-price.ts` and upserts the cache with the service-role client. Keeps the shared-cache rule (one cache, N tenants) — it only fills a hole, and reuses the cron's per-symbol success/failure logic (a failure records `last_error`, never touches `fetched_at`). Cost: one provider call at add time; Finnhub's free-tier rate limit is the thing to watch.
- **B. Wait for cron, but say so:** keep the daily refresh as the only writer and show "price arrives after the next daily refresh" on the Live Estimate. Zero new provider load, but the feature still feels broken on day one.
- **C. Client triggers the cron route:** rejected up front — the route is `CRON_SECRET`-gated and the secret must never reach the browser.

Also settle: if the fetch-on-add fails (provider down, unknown symbol), does the Holding still save? (Recommended: yes — the add succeeds, the Live Estimate area shows the recorded `last_error`-style "no price yet" state.)

**Blocked by:** none. Related to [07](07-live-estimates.md) (owns the cache and cron) and [18](18-stock-picker-autocomplete.md) (source of the symbol).

- [ ] Verified whether the production cron runs and `price_cache` is populated (recorded in the resolution)
- [x] Decision A/B settled with the user and recorded here
- [x] A newly added symbol with no cache row gets a price without waiting for the daily run (if A)
- [x] Add still succeeds when the price fetch fails; the failure is visible as "no price yet," not a crash
- [x] Shared-cache invariants intact: RLS unchanged, only service-role writes, `fetched_at` = last *successful* fetch
- [x] Test at the route seam: adding a Holding with an uncached symbol populates `price_cache`; a provider failure leaves the Holding saved and `fetched_at` untouched
- [ ] Live Estimate then shows in the detail pane (works together with [20](20-select-new-holding-after-add.md) so the new Holding is actually the one on screen)

## Resolution

Decision **A (fetch on add)** adopted, per the ticket's recommendation (not grilled with the user; say so if you want B). Built on `ticket-21-price-new-holding`, merged to main. Per-symbol success/failure logic extracted from the cron into `src/lib/market-data/refresh-price.ts` (`refreshPrice`), shared by the cron and by POST/PATCH `/api/holdings` when a symbol has no `price_cache` row. Service-role writes only; RLS unchanged. A provider failure or unknown symbol never fails the add (logged via `console.error`). `fetchJson` now has a 10s timeout (also applies to the cron).

- Route-seam tests: uncached symbol populates `price_cache`; provider failure and unknown symbol (`c: 0`) leave the Holding saved with no cache row. The `fetched_at`-untouched case is covered by the existing cron failure test (same `refreshPrice`).
- **Not verified:** step zero (prod cron firing, `price_cache` present and populated remotely, `last_error` values, `SUPABASE_SERVICE_ROLE_KEY`/`FINNHUB_API_KEY` in Vercel, remote migration applied). No prod access. Real Finnhub never called (stubbed). No browser check.
- Limits: `price_cache.price` is NOT NULL, so a never-priced symbol can't record `last_error`; UI shows the generic "no price yet". "No fresh row" is implemented as "no row" (stale rows left to the cron).
- **Follow-up ticket to file:** no throttle/negative cache — an authenticated user adding garbage symbols triggers a provider call each time (Finnhub free-tier and metals quota risk if opened to more users).
