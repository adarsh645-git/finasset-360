Type: build
Status: resolved

# 02: Deploy the skeleton to Vercel

**What to build:** The signed-in skeleton from ticket 01, running on a real URL against the real Supabase project, deploying from the connected GitHub repo.

Deliberately sequenced second rather than last. The first production deploy should debug one screen's worth of app, not sixteen tickets' worth at once.

Per [ADR 0002](../../../docs/adr/0002-stack-choice.md): one combined Next.js app on Vercel's hobby tier, Supabase for Postgres and auth.

**Blocked by:** 01. Also blocked by [Provision Supabase](../../asset-tracker-spec/issues/05-provision-supabase.md) — a human-only task (create the project, enable the Google provider, configure the OAuth client, record the URL and keys). Development can continue against a local Supabase while that is outstanding; this ticket cannot.

- [x] The GitHub repo is connected to the Vercel project and deploys on push
- [x] Supabase URL and keys come from environment, never from a committed file
- [x] The service-role key is not exposed to any client bundle
- [x] Google sign-in works against the deployed URL, with the OAuth redirect URI configured for it
- [x] A signed-in User sees their Portfolio and home currency in production

**Resolved:** deployed to `https://finasset-645.vercel.app`. Along the way, fixed a real bug uncovered by this deploy — `src/lib/supabase/env.ts` read `NEXT_PUBLIC_*` vars via a dynamic `process.env[name]` lookup, which Next.js's build-time inlining can't see, so those vars silently resolved to nothing in the client bundle no matter what was set in Vercel (see commit `fb35c20`). Also needed: Supabase Auth URL Configuration (Site URL / Additional Redirect URLs) pointed at the production domain, and the schema migration applied by hand to the hosted project via its SQL Editor, since it was provisioned as a bare project with no migration history.
