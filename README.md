# FinAsset 360

A multi-tenant net-worth tracker. See [`docs/SPEC.md`](docs/SPEC.md) for the
full v1 build spec and [`CONTEXT.md`](CONTEXT.md) for domain vocabulary.

## Stack

Next.js (App Router) + Supabase (Postgres, Google auth, Row-Level Security),
deployed to Vercel. See [ADR 0001](docs/adr/0001-multi-tenant-open-signup.md)
and [ADR 0002](docs/adr/0002-stack-choice.md).

## Local development

Requires a container runtime (Docker Desktop, Colima, or similar) for
`supabase start` — the local Postgres/Auth/Storage stack Supabase's CLI runs.

```bash
npm install
npx supabase start   # first run pulls images and applies supabase/migrations
```

`supabase start` prints a local API URL, anon key, and service-role key.
Copy `.env.example` to `.env.local` and fill those in. For Google sign-in to
work locally you also need a Google OAuth client (see
`supabase/config.toml`'s `[auth.external.google]` block) — set
`SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID`/`_SECRET` in `.env.local`, then
restart `supabase start` so it picks them up.

```bash
npm run dev
```

### Sample data + skipping `/login`

The app only signs in via Google OAuth, so a fresh local Supabase stack has
no `auth.users` row and always lands on `/login`.

```bash
npm run seed
```

is the one command for that: it creates (or reuses) one fixed local dev
user, wipes and reseeds their Holdings, Liabilities, Target Allocation, and
Projection with a generous sample Portfolio, and prints a one-time sign-in
link. Open that link once and you land on the dashboard directly — no
Google button, no `/login` — and the session cookie it sets makes every
later `localhost:3000` visit skip `/login` on its own, until it's cleared or
the local Supabase volume is wiped (rerun `npm run seed` in either case).
Refuses to run against anything but a `localhost`/`127.0.0.1`
`NEXT_PUBLIC_SUPABASE_URL`. See
[`.scratch/local-dev-tooling/01-seed-and-auto-signin.md`](.scratch/local-dev-tooling/01-seed-and-auto-signin.md)
for the full rationale.

### Tests

```bash
npm test          # unit tests + route-boundary tests
npm run typecheck
npm run lint
```

The route-boundary tests (`tests/route/**`) hit the real local Postgres
started above and need their own env file, `.env.test.local` (same shape as
`.env.example`, pointed at the local stack — see `tests/setup.ts`). They
fail with a clear error (not a skip) if that file isn't present, since a
missing env var there means the seam isn't actually being tested. See
"Testing Decisions" in `docs/SPEC.md` for why these two seams (a
pure-function engine, added in later tickets, and this
HTTP-route-against-real-Postgres boundary) are the only ones this project
unit/integration-tests.

**Verifying the RLS test actually tests something** (done once by hand for
ticket 01 — redo after any policy change): find the local Postgres
container (`docker ps --format '{{.Names}}' | grep supabase_db`), then

```bash
docker exec <container> psql -U postgres -d postgres \
  -c "alter table public.portfolio disable row level security;"
npm test   # 4 of 13 tests must now fail, including the explicit cross-tenant one
docker exec <container> psql -U postgres -d postgres \
  -c "alter table public.portfolio enable row level security;"
npm test   # back to 13/13
```
