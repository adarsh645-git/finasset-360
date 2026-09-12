Type: build
Status: resolved

# 17: Show Google display name in the top strip

**What to build:** The top bar now surfaces who is signed in, using the display name Google's OAuth flow already puts in Supabase's `auth.users.user_metadata.full_name` — nothing in this app read that field before. The dashboard's "FinAsset 360" heading and email line are dropped in favor of one persistent identity readout in the top strip, since keeping both would just duplicate it.

Not spec-derived — filed ad hoc from a user request ("add the user's name from Google on the home page"), grilled through `/grill-me` in the same session rather than drawn from `docs/SPEC.md`.

**Blocked by:** none.

- [x] First name (from `user_metadata.full_name`, falling back to email when absent) shown in `NetWorthStrip`
- [x] `DashboardPanel`'s "FinAsset 360" heading and email line removed entirely — identity now lives only in the top strip
- [x] `/login`'s heading and the browser tab title keep "FinAsset 360" — out of scope, this only touched the dashboard's own header
- [x] Name-only, no avatar — consistent with the rest of the app's plain-text style; no avatar/image UI exists anywhere else
- [x] The strip's "as of .../No Valuations recorded yet" status text is dropped in favor of the name, bright and bold to match the Net Worth figure's own weight — that status is still shown in `DashboardPanel`'s Net Worth section, so nothing is lost, just no longer duplicated in the strip

**Resolved:** New `src/lib/auth/display-name.ts` (`firstNameOrEmail`) is the one place Google's `full_name` metadata gets parsed down to a first name, with the email fallback. `src/app/page.tsx` computes it once from the existing `supabase.auth.getUser()` call and threads it into `PortfolioShell` as `userName` (replacing the old `userEmail` prop, which nothing else read once `DashboardPanel`'s header was removed). `PortfolioShell` passes `userName` down to `NetWorthStrip`, which renders it right-aligned with the same `text-sm font-semibold` weight as the Net Worth figure on the left — the strip is back to a plain two-item `justify-between` row, just with the name where the as-of/status text used to be. `DashboardPanel` no longer takes a name/email prop at all.

Verified: `npm test` (13 files, 115 passing, unchanged — no test seam exists for this presentational logic, consistent with `formatMoney` having none either), a clean `npm run typecheck`, a clean `npm run lint`, and a clean `next build`. **Not agent-verified in a browser** — this project's local stack has no Google OAuth client configured, so an interactive session can't be reached; UI is verified by hand at the user's own viewport per this build's established convention.
