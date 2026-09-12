Type: build
Status: resolved

# 17: Show Google display name in the top strip

**What to build:** The top bar now surfaces who is signed in, using the display name Google's OAuth flow already puts in Supabase's `auth.users.user_metadata.full_name` — nothing in this app read that field before. The dashboard's "FinAsset 360" heading and email line are dropped in favor of one persistent identity readout in the top strip, since keeping both would just duplicate it.

Not spec-derived — filed ad hoc from a user request ("add the user's name from Google on the home page"), grilled through `/grill-me` in the same session rather than drawn from `docs/SPEC.md`.

**Blocked by:** none.

- [x] First name (from `user_metadata.full_name`, falling back to email when absent) shown in `NetWorthStrip`, stacked under the existing as-of/status text
- [x] `DashboardPanel`'s "FinAsset 360" heading and email line removed entirely — identity now lives only in the top strip
- [x] `/login`'s heading and the browser tab title keep "FinAsset 360" — out of scope, this only touched the dashboard's own header
- [x] Name-only, no avatar — consistent with the rest of the app's plain-text style; no avatar/image UI exists anywhere else

**Resolved:** New `src/lib/auth/display-name.ts` (`firstNameOrEmail`) is the one place Google's `full_name` metadata gets parsed down to a first name, with the email fallback. `src/app/page.tsx` computes it once from the existing `supabase.auth.getUser()` call and threads it into `PortfolioShell` as `userName` (replacing the old `userEmail` prop, which nothing else read once `DashboardPanel`'s header was removed). `PortfolioShell` passes `userName` down to `NetWorthStrip`, which now renders a stacked right-hand block: the existing "as of .../No Valuations recorded yet" line on top, the name dimmed underneath it. `DashboardPanel` no longer takes a name/email prop at all.

Verified: `npm test` (13 files, 115 passing, unchanged — no test seam exists for this presentational logic, consistent with `formatMoney` having none either), a clean `npm run typecheck`, a clean `npm run lint`, and a clean `next build`. **Not agent-verified in a browser** — this project's local stack has no Google OAuth client configured, so an interactive session can't be reached; UI is verified by hand at the user's own viewport per this build's established convention.
