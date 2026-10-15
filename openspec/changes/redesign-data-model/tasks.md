# Tasks

## 1. CI runs the unit and route suites

Blocked by: none
Every pull request runs the Vitest unit tests and the route tests against a real local Supabase stack in GitHub Actions, so "pass in CI suites" means real CI from here on (D21). This is infrastructure only, with no scenarios of its own, and the existing suites are what prove it works.

- [ ] 1.1 A `unit` job runs `npm ci`, `npm run typecheck` and the `tests/unit` suite; it fails the PR on a failing test (checked by pushing a deliberately failing test on a throwaway branch, then removing it)
- [x] 1.2 A `route` job installs the Supabase CLI, runs `supabase start` and `supabase db reset`, writes `.env.test.local` from `supabase status -o env` with a test `CRON_SECRET`, and runs the `tests/route` suite
- [x] 1.3 Both jobs pass on the current `main` code, alongside the existing spec-coverage job

## 2. Cutover: new schema, isolation and the interim home page

Blocked by: 1
One migration drops every old table and creates the new schema with RLS (D1, D2 and the schema sketch). The Miller shell, old routes, helpers and their tests are deleted (D13, D19). `/` becomes the signed-in "Being rebuilt" page (D18), and `docs/SPEC.md` becomes a pointer to `openspec/specs/`. A new User gets a blank Portfolio, Countries are data, and every per-User table is isolated.

- [ ] 2.1 Tests named DM-01, DM-03, DM-04, DM-05, CI-01, CI-02 written and failing (red)
- [ ] 2.2 The new migration drops every old object and creates `country` (seeded with US and India), `portfolio` (with the trigger), `country_assumption`, `holding`, `position`, `holding_valuation`, `liability`, `liability_valuation`, `goal`, `stock_symbol`, `price_cache` and `fx_rate`, with the checks, composite foreign keys and policies in the design; `supabase db reset` applies it cleanly (DM-01, DM-03, DM-04, DM-05)
- [ ] 2.3 The files listed in D19 are deleted with their tests, `SignOutButton` and `firstNameOrEmail` survive, and `rg "asset_class_id|liability_class|home_currency|fx_rate_to_home|price_lookup_symbol|target_allocation|check_in|METALS" src tests scripts` finds nothing
- [ ] 2.4 `/` redirects a signed-out visitor to `/login` and shows a signed-in User "Being rebuilt" with their first name and Sign out, and no figures (CI-01, CI-02)
- [ ] 2.5 `docs/SPEC.md` keeps its title, Problem Statement and session-rhythm facts (today's lines 8–20) under a note pointing to `openspec/specs/`, CONTEXT.md and `docs/adr/`; `.env.example` loses the two metals keys
- [ ] 2.6 Tests named DM-01, DM-03, DM-04, DM-05, CI-01, CI-02 pass in CI suites; npm run spec:coverage passes
- [ ] 2.7 Interim page checked by hand at 2000px, 800px and 390px: readable, with no horizontal scroll, and Sign out works

## 3. Manually valued Holdings: create, edit, Update value and archive

Blocked by: 2
A User can create, edit, update the value of and archive a Cash, Crypto, Metals, Real estate or Vehicles & other Holding. Each save records today's Valuation, even when unchanged, with class-specific fields checked (D3, D4, D7, D10).

- [ ] 3.1 Tests named DM-06, DM-07, DM-08, DM-09, DM-10, DM-11, DM-12, DM-13, DM-14, DM-15, DM-16, DM-17, DM-27 written and failing (red)
- [ ] 3.2 `POST /api/holdings` validates name, Country, Asset Class, value, Cost Basis, Description and the class-specific fields, and stores the Holding and today's Valuation (DM-06…DM-12)
- [ ] 3.3 `POST /api/holdings/[id]/valuations` upserts today's Valuation, including unchanged values and same-day overwrites, and refuses Stocks (DM-13, DM-14, DM-15)
- [ ] 3.4 `PATCH /api/holdings/[id]` replaces the editable fields, upserts today's Valuation, and refuses a Country or Asset Class change (DM-16, DM-17)
- [ ] 3.5 `POST /api/holdings/[id]/archive` sets the archive date; an archived Holding refuses edits and Update value with 409 (DM-27)
- [ ] 3.6 Tests named DM-06, DM-07, DM-08, DM-09, DM-10, DM-11, DM-12, DM-13, DM-14, DM-15, DM-16, DM-17, DM-27 pass in CI suites; npm run spec:coverage passes

## 4. Ticker data, Sectors and ticker lookup

Blocked by: 2
Shared ticker data keeps each US symbol's exchange, provider industries map onto the 12 Sectors, and a User can look up a ticker for a Country. The lookup previews name, Sector, exchange and price, or reports "unknown" with a name from search (D15).

- [ ] 4.1 Tests named MD-01, MD-02, MD-03, MD-04, MD-05, MD-06, MD-07, MD-08 written and failing (red)
- [ ] 4.2 Shared tables are readable by any signed-in User and writable by none (MD-01)
- [ ] 4.3 The weekly symbol refresh stores `mic` and keeps resolved Sectors; both cron routes refuse a missing or wrong secret (MD-02, MD-03)
- [ ] 4.4 The industry-to-Sector map covers the 12 Sectors with Other as the fallback (MD-04)
- [ ] 4.5 `GET /api/tickers/lookup` normalises the ticker (`.NS` for India), returns known data with an exchange label, fetches and caches a first price, and falls back to Finnhub `/search` for a name (MD-05…MD-08)
- [ ] 4.6 Tests named MD-01, MD-02, MD-03, MD-04, MD-05, MD-06, MD-07, MD-08 pass in CI suites; npm run spec:coverage passes

## 5. Stocks Holdings with Positions and Hand Prices

Blocked by: 3, 4
A User can create and edit a Stocks Holding with its full Positions list. Tickers are normalised, average cost defaults to the price, unknown tickers carry a Hand Price, Sector and name, dated today when new or changed (or when `confirm_prices: true` confirms them all), and each save records today's Valuation at Σ shares × price (D5, D6).

- [ ] 5.1 Tests named DM-18, DM-19, DM-20, DM-21, DM-22, DM-23, DM-24, DM-25, DM-39, DM-40 written and failing (red)
- [ ] 5.2 Stocks create and edit validate the Positions list (at least one, shares > 0, unique tickers, `.NS` for India) and replace it in one database call, so a failed save keeps the old list (DM-18…DM-21)
- [ ] 5.3 A ticker with no cached price needs a Hand Price; Sector defaults to Other and the name to the ticker (DM-22, DM-23, DM-25)
- [ ] 5.4 `price as of` becomes today only for a new or changed Hand Price; `confirm_prices: true` re-dates every Hand Price on the Holding; an unchanged price otherwise keeps its date (DM-24, DM-39, DM-40)
- [ ] 5.5 Each Stocks save upserts today's Valuation at Σ shares × price, market price first (DM-18)
- [ ] 5.6 Tests named DM-18, DM-19, DM-20, DM-21, DM-22, DM-23, DM-24, DM-25, DM-39, DM-40 pass in CI suites; npm run spec:coverage passes

## 6. Liabilities: create, edit, balance edit, link and archive

Blocked by: 3
A User can record a loan, edit it, update its balance and archive it, and link it to one of their active Holdings. Each save records today's balance Valuation, and archiving a Holding unlinks its loan (D8, D9, D10).

- [ ] 6.1 Tests named DM-26, DM-28, DM-29, DM-30, DM-31, DM-32, DM-33 written and failing (red)
- [ ] 6.2 `POST /api/liabilities` and `PATCH /api/liabilities/[id]` validate balance, APR, Monthly payment, principal (stored as max with balance), term, start month and revolving, and upsert today's balance Valuation (DM-28…DM-30)
- [ ] 6.3 `POST /api/liabilities/[id]/valuations` upserts today's balance (DM-31)
- [ ] 6.4 Links accept only the User's own active Holdings with no other active loan; archiving a Holding unlinks its loans (DM-26, DM-32)
- [ ] 6.5 `POST /api/liabilities/[id]/archive` keeps the Valuations and link and makes the loan read-only (DM-33)
- [ ] 6.6 Tests named DM-26, DM-28, DM-29, DM-30, DM-31, DM-32, DM-33 pass in CI suites; npm run spec:coverage passes

## 7. Goals and Projection Assumptions

Blocked by: 2
A User can add and remove Goals and set or clear any Projection Assumption, Monthly savings, savings growth and horizon. A blank means the default (D11, D12).

- [ ] 7.1 Tests named DM-34, DM-35, DM-36, DM-37, DM-38 written and failing (red)
- [ ] 7.2 `POST /api/goals` stores an optional name and `target_usd > 0`; `DELETE /api/goals/[id]` really deletes it (DM-34, DM-35)
- [ ] 7.3 `PATCH /api/projection-assumptions` updates only the fields sent, treats null as blank, upserts `country_assumption` rows and enforces the ranges (DM-36, DM-37, DM-38)
- [ ] 7.4 Tests named DM-34, DM-35, DM-36, DM-37, DM-38 pass in CI suites; npm run spec:coverage passes

## 8. The daily job: FX, prices and Stocks snapshots

Blocked by: 5
One daily cron route stores today's FX Rate and fills any gap (from 2018-01-01 on an empty table). It refreshes prices for held US tickers, then records today's Valuation for every active Stocks Holding, marked automatic, using the last cached price when a quote fails (D14, D16).

- [ ] 8.1 Tests named MD-10, MD-11, MD-12, MD-13, MD-14, MD-15, MD-16, MD-17, MD-18, MD-19 written and failing (red)
- [ ] 8.2 The FX step requests Frankfurter's range from the day after the latest stored date (or 2018-01-01) and upserts each date; an outage writes nothing and the later steps still run (MD-10…MD-13)
- [ ] 8.3 The price step quotes only distinct listed tickers in active Stocks Holdings and keeps the last price on failure (MD-14, MD-15)
- [ ] 8.4 The snapshot step upserts today's Valuation for every active Stocks Holding across Users, marked automatic, keeps a same-day user-entered mark, and is safe to rerun (MD-16…MD-19)
- [ ] 8.5 `vercel.json` schedules `/api/cron/daily` at 13:00 UTC and keeps the weekly symbol refresh; `/api/cron/refresh-prices` is gone
- [ ] 8.6 Tests named MD-10, MD-11, MD-12, MD-13, MD-14, MD-15, MD-16, MD-17, MD-18, MD-19 pass in CI suites; npm run spec:coverage passes

## 9. Read model and GET /api/portfolio

Blocked by: 5, 6, 7, 8
`loadPortfolio(supabase, today)` returns one User's whole Portfolio in one load: Holdings with Positions, price sources, Hand Price dates, current values and Cost Basis; Liabilities with current balances and links; every Valuation with who recorded it; archived items; today's FX Rate with its date and the FX history; assumptions with blanks kept; and Goals. It's served as `GET /api/portfolio` (D17).

- [ ] 9.1 Tests named RM-01, RM-02, RM-03, RM-04, RM-05, RM-06, RM-07, RM-08, RM-09, RM-10, RM-11, RM-12, MD-09, DM-02 written and failing (red)
- [ ] 9.2 `loadPortfolio` is a plain async function in `src/lib/read-model/` returning the `PortfolioData` shape in the design, under the User's session (RM-01, RM-02, RM-03, DM-02)
- [ ] 9.3 Current value and Cost Basis follow the price precedence (market data beats a Hand Price), and liabilities show their recorded balance (RM-04, RM-05, RM-06, MD-09)
- [ ] 9.4 Archived items, Valuation sources, FX today with its as-of date, and the FX history from the earliest Valuation are included (RM-07, RM-08, RM-09, RM-12)
- [ ] 9.5 Assumptions come back as stored with the Country defaults beside them, and Goals sorted by target (RM-10, RM-11)
- [ ] 9.6 Tests named RM-01, RM-02, RM-03, RM-04, RM-05, RM-06, RM-07, RM-08, RM-09, RM-10, RM-11, RM-12, MD-09, DM-02 pass in CI suites; npm run spec:coverage passes

## 10. Seed data close to the prototype

Blocked by: 9
`npm run seed` fills the dev User's Portfolio with the prototype's Holdings, Positions, loans and Goals, monthly Valuation history, US market data, Hand-Priced India Positions (one 47 days old) and some filled-in assumptions. Later UI changes can then be checked by hand before their forms exist (D20).

- [ ] 10.1 The seed script wipes and reinserts the dev User's records on the new schema, fills an empty FX table from 2018-01-01, and prints the sign-in link; running it twice gives the same Portfolio
- [ ] 10.2 `GET /api/portfolio` for the dev User returns 14 Holdings, 4 Liabilities with the prototype's links, 4 Goals and Valuations back to each item's start month (checked with `curl` against `npm run dev`)

## 11. Production rollout

Blocked by: 2, 3, 4, 5, 6, 7, 8, 9, 10
The new schema is live in production, FX is backfilled, and the interim page shows. The deploy pipeline doesn't apply migrations, so these steps are explicit (Migration Plan).

- [ ] 11.1 `supabase db push` applied to production; `select code, currency, default_stocks from country order by code` returns `IN, INR, 11` and `US, USD, 7`, and `select to_regclass('public.asset_class')` returns null
- [ ] 11.2 The production daily job run once with `CRON_SECRET`; `select min(rate_date), max(rate_date), count(*) from fx_rate` starts at 2018-01-02 and ends within 3 days of today
- [ ] 11.3 Human task: in the Vercel dashboard (Project → Settings → Environment Variables), delete `METALS_DEV_API_KEY`, and `METALPRICE_API_KEY` if present, from Production, Preview and Development, then confirm that `vercel env ls` lists neither
- [ ] 11.4 Production checked by hand at 2000px, 800px and 390px: signing in shows the interim page, and the next day's cron log shows the daily job succeeding

## Workflow follow-up

- Run `/opsx:verify redesign-data-model` once every ticket is done, then open the PR.
- The user runs `/opsx:archive` after merge.
