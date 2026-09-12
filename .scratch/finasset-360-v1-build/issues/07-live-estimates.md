Status: resolved

# 07: Live Estimates from a shared price cache

**What to build:** A Holding that tracks a market symbol shows a Live Estimate — quantity times the latest cached price — so the User can see roughly where it stands without looking anything up. It is labelled with how it differs from the last Valuation, and a one-click "use" records it as a Valuation. A Holding without a symbol (a house) simply has no Live Estimate.

The Live Estimate must read as clearly **not** a Valuation. A Valuation is always a deliberate, User-recorded snapshot; the Live Estimate is a convenience figure and is never persisted as one.

One shared server-side cached fetch serves every tenant. This is a hard requirement, not an optimisation — none of these free tiers survive N tenants polling independently.

Spec: [`docs/SPEC.md`](../../../docs/SPEC.md) — user stories 32–38.

**Blocked by:** 04. (The cron route can be exercised locally; ticket 02 is what puts it on a real schedule.)

- [x] `price_lookup_symbol` and `quantity` on a Holding, populated together
- [x] `price_cache` keyed by `symbol`, with `price`, `price_currency`, `source`, `last_error`, `fetched_at`
- [x] No foreign key from `holding.price_lookup_symbol` into `price_cache` — the cache is global and independent of any tenant's data
- [x] RLS **enabled** on `price_cache` with `FOR SELECT TO authenticated USING (true)` and no write policy for any client role; only the service-role key writes
- [x] A Vercel Cron Job in `vercel.json` invokes a Next.js API route protected by the `CRON_SECRET` bearer token
- [x] Finnhub for stocks and ETFs; Metals.Dev primary with MetalpriceAPI fallback for metals; keys server-side only
- [x] Live Estimate shown as visually distinct from the recorded Valuation, labelled with the difference from the last Valuation
- [x] Cached-price age is visible where freshness matters (once-daily refresh with ±59min slack must not read as real-time)
- [x] One-click "use" records the Live Estimate as a Valuation
- [x] Test: `price_cache` is readable by an authenticated client and **not writable by one**, including with a client-side key
- [x] Test: the cron route rejects a request without the `CRON_SECRET` bearer token
- [x] Test: a provider failure leaves the previous good price in place and records `last_error` **without touching `fetched_at`** — so `fetched_at` stays trustworthy as last *successful* fetch
- [ ] Before shipping to real users: check Finnhub's free-tier "personal, non-commercial" wording by hand, and the provider figures flagged lower-confidence in `research/market-data-apis.md` — **left unchecked deliberately; this is a human action item, not something an agent session can complete.**

**Resolved:** Migration `20260912180000_create_price_cache_and_live_estimate.sql` adds `holding.price_lookup_symbol`/`quantity` (plain text/numeric, no FK — enforced "populated together" at the application layer in `src/lib/holdings/price-lookup.ts`, reused client-side by `src/lib/holdings/price-lookup-input.ts` so `AddHoldingRow`/`HoldingDetailPanel` reject a mismatched pair before the round trip) and the `price_cache` table with RLS enabled (`price_cache_select_authenticated`, `SELECT`-only, no write policy for any client role).

`src/app/api/cron/refresh-prices/route.ts` is the one shared fetch: gated on the `CRON_SECRET` bearer token (`vercel.json` schedules it daily), it reads every tenant's distinct `price_lookup_symbol`s via the service-role client (`src/lib/supabase/admin.ts`) and, per symbol, either upserts a fresh `price_cache` row or — on failure — updates only `last_error`, leaving `price`/`fetched_at` untouched (and doing nothing at all if no row exists yet, since there's no price to preserve). `src/lib/market-data/` holds the provider clients: `finnhub.ts` (stocks/ETFs, USD quotes), `metals.ts` (Metals.Dev primary, MetalpriceAPI fallback, both by symbol → USD spot price), `symbols.ts` (a fixed XAU/XAG/XPT/XPD set routes a symbol to metals vs. Finnhub), and `fetch-price.ts` (the dispatcher). `live-estimate.ts` holds the pure display logic — `computeLiveEstimate`, `compareToLastValuation` (refuses to diff across a currency mismatch rather than fabricate an FX rate), and `priceAgeLabel` (hour-grained near the boundary so a 23-hour-old price can't read as "today").

`LiveEstimate.tsx` renders in `HoldingDetailPanel` only when a Holding has both fields set: a dashed-border block, visually distinct from the Valuation editor above it, labelled with the diff from the last Valuation and the cached price's age, with a "Use this" button that records it as a Valuation via the same endpoint a manual entry uses — disabled (with an explanatory note) rather than silently mis-recording when the cached price's currency doesn't match the Holding's own.

Verified: `npm test` (16 files, 152 passing — new coverage in `tests/route/price-cache.test.ts` for `price_cache` RLS and the cron route's secret gate and provider-failure behaviour, `tests/unit/live-estimate.test.ts` and `tests/unit/price-lookup.test.ts` for the pure helpers, plus new cases in `tests/route/holdings.test.ts` for the "populated together" rule), a clean `npm run typecheck`, a clean `npm run lint`, and a clean `next build`. Manually exercised the cron route directly against `next dev` (401 with no token, 401 with the wrong token, 200 with the correct one). **Not agent-verified in a browser** — this project's local stack has no Google OAuth client configured; UI is verified by hand at the user's own viewport per this build's established convention.

**Two provider integrations are best-effort, not hand-verified against live traffic** — Finnhub's `/quote` shape is stable/well-documented, but Metals.Dev's and MetalpriceAPI's exact request/response shapes (`src/lib/market-data/metals.ts`) were written from the research file's necessarily-incomplete notes (their pricing/ToS pages are JS-rendered SPAs the research tooling couldn't fully read) and from general knowledge, not a live call. Defensive validation (reject a non-finite/non-positive parsed price rather than cache it) means a wrong assumption fails safe as a recorded `last_error`, never a bad price — but the checklist's last item, verifying these providers and their free-tier ToS wording by hand, is still open and belongs to the user, not this session.

Reviewed via `/code-review` (Standards + Spec sub-agents in parallel). Both surfaced real findings, addressed before this commit:
- Standards flagged duplicated "positive finite number" quantity validation across the server (`price-lookup.ts`) and client (`price-lookup-input.ts`) mirrors — extracted to one `src/lib/holdings/quantity.ts` predicate used by both. It also flagged the identical fetch/parse/HTTP-status boilerplate repeated three times across `finnhub.ts` and `metals.ts`'s two provider functions — extracted the network-and-parse (not the per-provider field extraction, which genuinely differs) into `src/lib/market-data/fetch-json.ts`.
- Spec caught that `LiveEstimate`'s "Use this" action had no guard against the same currency mismatch its own diff calculation refuses to compute — it would have silently recorded a Valuation using a cached USD price as if it were in the Holding's own currency when the two differ. Fixed: the button is now replaced with an explanatory note in that case. It also caught `page.tsx`'s Holding query hand-spelling the same column list the new `HOLDING_COLUMNS` constant exists to keep in sync — switched it to use the constant.
