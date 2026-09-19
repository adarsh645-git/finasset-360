Type: task
Status: resolved

## Question

Local dev friction: every fresh `supabase start` (or first-ever run) has zero rows in `auth.users`, so opening `localhost:3000` always lands on `/login`, and there's no sample data to actually look at once signed in — nothing overflows a panel, nothing fills a column, the Plan page is empty. Build a "simple local setup" that fixes both in one command.

Surfaced while manually verifying the pinned-action-buttons layout fix — that fix specifically needs *enough* data (many Holdings in one Asset Class, a Holding with rich Valuation history, a Liability with full Amortization Assumptions) to actually prove itself; a bare fresh Portfolio can't show it.

Not part of either closed map (`asset-tracker-spec`, `finasset-360-v1-build`) — both reached their destination (a spec, a deployed v1); this is post-launch dev tooling, out of either's scope.

## Answer

Resolved as `scripts/seed-local.mjs` (`npm run seed`), checked in and documented in README's "Local development" section.

**Mechanism (no app code touched):** the script uses the service-role key to find-or-create one fixed dev user (`adarsh645@gmail.com` — via `admin.createUser` on first run, exactly how `tests/fixtures/users.ts` already gets a real authenticated session headlessly, since the app only signs in via Google OAuth and a script can't drive that), wipes and reseeds their Holdings/Liabilities/Target Allocation/Projection (their Portfolio row, auto-created by the same `on_auth_user_created` trigger a real sign-in fires, is left alone), then calls Supabase Admin's `generateLink` and prints a one-time sign-in URL. Opening it once sets a normal session cookie; every `localhost:3000` visit after that lands straight on `/`, no `/login`, until the cookie is cleared or the local Supabase volume is wiped (in which case: rerun the script — it recreates the user too).

**Account:** the same fixed local dev email every time (`adarsh645@gmail.com`) — not a separate fake email. Fully local Supabase instance, no path to production.

**Reseed behavior:** destructive — every run deletes then reinserts this user's Holdings, Liabilities (and their Valuations, which cascade), Target Allocation, and Projection, so the command always returns to the same known state rather than accumulating across runs.

**Data shape** (deliberately generous, not minimal — sized to make the panels the layout fix touches actually overflow):
- 15 Equity Holdings (enough to force the Holdings column to scroll), plus 2 Real Estate, 2 Cash, 2 Crypto, 1 Precious Metal.
- One Equity Holding (`price_lookup_symbol` set) carries 18 months of Valuation history — tall enough that its detail panel (Live Estimate + full history table + every field) needs the pinned footer to reach Save/Archive/Delete.
- One Mortgage Liability has every Amortization Assumption field filled in and is linked to the Real Estate Holding it financed, plus 12 months of balance history — the tallest form in the app, same reason.
- `price_cache` seeded for every symbol used, so Live Estimate renders without waiting on the real cron job.
- Target Allocation set across all 5 default Asset Classes (sums to 100%); Projection assumptions saved (growth/contribution/escalation/inflation/target) so the Plan page isn't empty either.

Guarded to refuse running against anything but a `localhost`/`127.0.0.1` `NEXT_PUBLIC_SUPABASE_URL`.
