Type: build
Status: resolved

# 04: Record a Valuation, see Net Worth

**What to build:** The app's core loop. A User clicks a Holding's value, types a number, presses Enter, and a Valuation is recorded dated today — one interaction, not a form. They can backdate when entering a figure they looked up last week. Re-recording on a day they already recorded corrects that day's figure rather than creating a second one. The Net Worth headline appears, and stays readable in the top strip after they navigate away.

The FX decision matters here and is easy to get subtly wrong: the rate to the home currency is captured **at the moment of recording** and stored on the row, so a historical total is computed with the rate that was true then, not with today's.

Spec: [`docs/SPEC.md`](../../../docs/SPEC.md) — user stories 22–26, 48–51.

**Blocked by:** 03.

- [x] Click-to-edit a value, type, Enter or blur records a Valuation dated today
- [x] A backdating affordance sets a different `recorded_at`
- [x] `unique (holding_id, recorded_at)` — a same-day re-record is an `UPDATE` of that row, not a second row
- [x] `holding_valuation` carries `amount` in the Holding's own currency, `fx_rate_to_home`, `home_currency_at_recording`, `recorded_at date`, and a denormalized `user_id` so RLS stays a flat one-column check with no join
- [x] `recorded_at` is a `date`, not a `timestamptz`
- [x] Home-currency value is computed on read as `amount * fx_rate_to_home`, never stored
- [x] Net Worth headline with its component breakdown and an as-of date
- [x] Persistent Net Worth readout in the top strip (Miller columns scroll column 1 out of view)
- [x] Test: recording twice on the same date updates rather than inserts
- [x] Test: `fx_rate_to_home` and `home_currency_at_recording` are captured at record time, and **changing `portfolio.home_currency` afterwards does not retroactively alter historical totals**
- [x] Test: User A cannot read or write User B's Valuations
- [x] Test: deleting a Holding cascades its Valuations

**Resolved:** all criteria verified against the local Supabase harness (`npm test`, 56/56 passing, including 15 new route-boundary tests in `tests/route/valuations.test.ts` covering the RLS/upsert/FX-immutability/cascade cases above, plus two new pure-function unit test files) and a clean `npm run typecheck` / `npm run lint`.

The spec names no FX-rate provider anywhere (only stock/metal price providers are researched, for ticket 07's Live Estimates). That gap was raised with the user directly; they chose a live free FX API (Frankfurter, ECB rates, no key) fetched server-side at record time, falling back to this User's own most recently recorded rate for the same currency pair if the live fetch fails — `src/lib/fx/rate.ts`. Both the live-success and fallback-on-failure paths are tested, the latter by stubbing only the FX provider's `fetch` call.

Net Worth is Holdings-only for now (`netWorth === holdingsTotal`) since ticket 05 hasn't added Liabilities yet — the breakdown, netting, and the "Holdings − Liabilities" reading all land there. The "as-of date" is the newest `recorded_at` among the Holdings' latest Valuations (a MAX), matching the prototype's `DERIVED.mostRecent` convention in `.scratch/asset-tracker-spec/prototypes/tree-ui/`.

The click-to-edit interaction, backdating affordance, and persistent top-strip readout are implemented but **not agent-verified in a browser** — per this build's own "UI is verified by hand" convention (docs/SPEC.md's Testing Decisions). `.env.local` has real Google OAuth configured for interactive use, so it's directly testable at `http://localhost:3000`; `.env.test.local` (used by the automated suite) deliberately does not.
