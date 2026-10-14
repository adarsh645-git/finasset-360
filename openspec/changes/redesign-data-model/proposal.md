# Proposal

## Why

The redesign ([map #13](https://github.com/adarsh645-git/finasset-360/issues/13)) changes the shape of almost every record. A Stocks Holding becomes an account of Positions, Asset Classes are a fixed six, Liabilities are flat loans, Valuations are dated with no FX on them, FX comes from a shared daily table, and Goals and per-Country Projection Assumptions replace Target Net Worth and the single growth rate. The old Miller-column app can't run on that model, and production holds only test data. This change is the cutover, second in the [nine-change sequence](https://github.com/adarsh645-git/finasset-360/issues/16). It ships early because Stocks history only starts once the daily cron takes snapshots.

## What Changes

- **BREAKING: new schema from scratch.** One migration drops every old table, policy and function and creates the new schema, all with Row-Level Security. There's no data migration (production holds only test data).
  - **Country** is data: US and India, each with its currency and its default inflation, Real estate, Stocks and Cash rates.
  - **Asset Class** is one of six fixed ids, checked by the database.
  - **Holding**: Country, Asset Class, name, optional Description, optional Cost Basis, a Property type and city for Real estate, and an optional quantity with a `g` / `oz t` unit for Metals. `archived_at` stays (ADR 0004).
  - **Position**: ticker, shares and average cost. A ticker without market data also carries a Hand Price with its `price as of` date, a Sector and a name.
  - **Liability**: a flat loan with principal, APR, Monthly payment, optional term, start month, a revolving flag and an optional linked Holding. Its balance lives only in its Valuations.
  - **Valuations** for Holdings and Liabilities: at most one per item per day, in native currency, with no FX on them. Every save upserts today's Valuation, even when the value hasn't changed.
  - **Projection Assumptions** (blank = default), **Monthly savings** per Country, savings growth and a horizon (1–40, default 10).
  - **Goals**: a name and `target_usd > 0`. Removing a Goal deletes it.
  - **Shared market data:** an `fx_rate(date, INR per USD)` table, and ticker data that gains the exchange (`mic`).
- **Write routes** under `/api/**`, each with route tests against a real local Postgres:
  - Holdings: create, edit and archive. Stocks create and edit carry the full Positions list.
  - Update value, which upserts today's Valuation.
  - Liabilities: create, edit, balance edit and archive.
  - Goals: create and delete.
  - Projection Assumptions, as one partial-update settings route.
  - Ticker lookup by ticker and Country.
- **Read model:** one server function, `loadPortfolio`, also served as `GET /api/portfolio`. It returns everything later pages need, built on the calculations module.
- **Cron rewrite:**
  - The daily job upserts today's FX Rate (filling any gap), refreshes prices for held US tickers, then takes a Stocks snapshot: today's Valuation for every non-archived Stocks Holding, using the last cached price when a quote fails.
  - The weekly symbol refresh keeps the exchange, and Finnhub's industry maps onto the 12 Sectors.
- **Production rollout as named tasks:** an explicit `supabase db push` checked with a verifying query, then the one-time FX backfill from Frankfurter's historical series.
- **BREAKING: deletion.** The Miller shell, the old routes, `src/lib/*` helpers and components go: Metals.Dev, Check-in, Target Allocation, Live Estimate, home currency, Liability Classes, custom Asset Classes, and the old engine and helpers that the calculations module replaced. The Metals.Dev key is also removed from Vercel, by hand.
- **Interim state:** `/` becomes a signed-in "Being rebuilt" page. Production can't record anything until `redesign-holding-entry`.
- **Docs and tooling:**
  - `docs/SPEC.md` becomes a pointer to `openspec/specs/`, keeping its problem statement.
  - `scripts/seed-local.mjs` is rewritten with sample data close to the prototype's Holdings, loans and Goals, so later UI changes can be checked by hand before their forms exist.
  - Ticket 1 adds GitHub Actions jobs for the Vitest unit tests and the route tests (`supabase start`).

### Non-goals

- Any page beyond the interim one. Every screen comes in later changes.
- Migrating old data, or keeping the old app at `/legacy`.
- A permanent "Delete" for Holdings or Liabilities, entering past Valuations, Indian or metal price feeds, mixed-currency accounts, a trade ledger, Countries beyond US and India, and Target Allocation.

## Capabilities

### New Capabilities

- `portfolio-records`: the stored portfolio. Countries, the six Asset Classes, Holdings, Positions, Liabilities, Valuations (one per day, upserted on every save), archiving, Goals, Projection Assumptions and Monthly savings, with validation and per-User isolation.
- `market-data`: shared ticker data with exchange and Sector, prices and the Hand Price precedence, the ticker lookup, the FX Rate table and its backfill, and the daily and weekly cron jobs, including Stocks snapshots.
- `portfolio-read-model`: everything one User's screens read, in one load. Current values, Valuation history, FX Rates, Projection Assumptions with blanks kept blank, and Goals. Also the interim "Being rebuilt" home page.

### Modified Capabilities

None (`openspec/specs/` is empty).

## Impact

- **Database:** one new migration replaces all 15 old ones' objects. Remote migrations aren't applied by the deploy pipeline, so the production `db push` and its check are explicit tasks.
- **Code:**
  - Deleted: almost all of `src/app/api/**`, `src/components/**` and `src/lib/**`, plus their tests.
  - New: `src/lib/read-model/`, `src/lib/market-data/` (rewritten), and the new route handlers.
  - Kept: auth (`src/lib/supabase/*`, login, auth callback, dev sign-in) and `src/lib/http/body.ts`.
- **Cron:** `vercel.json` points at the new daily job and the weekly symbol refresh.
- **Env:** `METALS_DEV_API_KEY` and `METALPRICE_API_KEY` leave `.env.example`, and the Metals.Dev key leaves Vercel (a manual task).
- **CI:** new workflow jobs for unit and route tests.
- **Docs:** `docs/SPEC.md` is cut down to a pointer. No CONTEXT.md or ADR edits. Two small glossary nits are reported for the docs owner: the Sector example "Financial Services" should read "Financials" (the mockup's list), and Goal's name may be blank.
- **Depends on:** `redesign-calculations` (`src/lib/calc/`), whose D6 already allows Country defaults to be passed in from a table.
