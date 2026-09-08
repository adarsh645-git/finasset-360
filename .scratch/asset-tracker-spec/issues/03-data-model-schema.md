Type: grilling
Status: resolved

## Question

Finalize the concrete data-model schema: tables/columns/relations for User, Portfolio, Asset Class, Holding, Liability Class, Liability, Valuation, Target Allocation, and Projection — including the currency + FX-rate-at-time-of-record fields on Valuation, and how Postgres Row-Level Security policies attach to each table (which column is the `auth.uid()` scope, and at what level — directly on every table, or only on Portfolio with everything else cascading through a foreign key).

Also design the **shared price-cache table** surfaced by [the market-data-API research](01-market-data-api-research.md): a cron-updated table of latest stock/gold prices, shared across all tenants (not RLS-scoped per user, since prices aren't private data) and read by every Holding's live-valuation display.

## Answer

### Anchor: `portfolio`

- `user_id uuid primary key references auth.users(id)`
- `home_currency char(3) not null`

1:1 singleton per signed-in User. No separate `users`/`profiles` table exists — this row *is* the app's profile, since Supabase's own `auth.users` isn't ours to extend. Every other user-owned table hangs its ownership off this same `user_id`, not a separate `portfolio_id` — there's only ever one anchor row per user, so a second key would be redundant.

RLS (this pattern repeats on every table below unless noted): `USING (user_id = auth.uid())` for all operations.

### `asset_class` / `liability_class`

Two separate tables, identical shape (not one shared table with a `kind` discriminator — that would let an FK accidentally point a Holding at a Liability Class, or need a trigger to prevent it):

- `id uuid primary key default gen_random_uuid()`
- `owner_id uuid null references auth.users(id)` — `NULL` = global default shipped with the app (visible to everyone); non-null = one user's custom class.
- `name text not null`

RLS: `SELECT` → `owner_id IS NULL OR owner_id = auth.uid()`. `INSERT/UPDATE/DELETE` → `owner_id = auth.uid()` only (global defaults aren't editable or deletable by anyone at the row level).

### `holding`

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references portfolio(user_id)`
- `asset_class_id uuid not null references asset_class(id) on delete restrict`
- `name text not null` — e.g. "10 shares of AAPL", "123 Main St"
- `currency char(3) not null` — ISO 4217, validated at the app layer only (no DB reference table)
- `price_lookup_symbol text null` — join key into `price_cache`; NULL for manually-valued Holdings (e.g. Real Estate)
- `quantity numeric null` — populated only alongside `price_lookup_symbol`, used to compute a Live Estimate (`quantity × price_cache.price`) — never persisted as a Valuation
- `archived_at timestamptz null` — see **Deletion & archival** below
- `created_at timestamptz not null default now()`

### `liability`

Same shape as `holding` minus `price_lookup_symbol`/`quantity` (Liabilities are never live-priced): `id, user_id, liability_class_id (references liability_class(id) on delete restrict), name, currency, archived_at, created_at`.

### `holding_valuation` / `liability_valuation`

Two separate tables (not one polymorphic/shared table — a plain FK can't target "one of two tables," and a nullable-pair or `(owner_type, owner_id)` design loses real referential integrity). Identical shape, `holding_id`/`liability_id` swapped:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references portfolio(user_id)` — denormalized here even though derivable via the holding/liability, so RLS stays a flat one-column check with no join
- `holding_id uuid not null references holding(id) on delete cascade`
- `amount numeric not null` — in the Holding/Liability's own fixed `currency`
- `fx_rate_to_home numeric not null` — rate from that currency to the Portfolio's home currency, *at the moment this row was recorded*
- `home_currency_at_recording char(3) not null` — which home currency `fx_rate_to_home` targets; guards against a later change to `portfolio.home_currency` retroactively misinterpreting old rows
- `recorded_at date not null` (date, not timestamptz — sub-day precision isn't meaningful for a periodic snapshot)
- `created_at timestamptz not null default now()`
- `unique (holding_id, recorded_at)` — one snapshot per day; a same-day correction means `UPDATE`ing this row, not inserting a second

Home-currency value is always computed on read (`amount * fx_rate_to_home`) — never precomputed/stored, since it's a trivial multiplication and this isn't a high-QPS service.

### `target_allocation`

- `user_id uuid not null references portfolio(user_id)`
- `asset_class_id uuid not null references asset_class(id) on delete cascade`
- `target_percent numeric not null`
- `primary key (user_id, asset_class_id)`

Asset-Class only — no Liability Class equivalent. `on delete cascade` here (unlike Holding/Liability's `restrict`) because a Target Allocation is a current-state goal setting with no historical significance — nothing is lost by letting it disappear along with the class it targets.

### `projection`

- `user_id uuid primary key references portfolio(user_id)` — singleton per Portfolio, same pattern as `portfolio` itself.

This ticket fixes only the table's existence and cardinality (one active assumption set per Portfolio, not multiple saved/named scenarios). Its assumption columns (growth rate, contribution amount/frequency, timeline) are [Projection method](04-projection-method.md)'s job.

### `price_cache` — the one non-tenant-scoped table

- `symbol text primary key` — a ticker (`AAPL`) or a metals code (`XAU`)
- `price numeric not null`
- `price_currency char(3) not null`
- `source text not null` — `'finnhub' | 'metals_dev' | 'metalprice_api'`
- `last_error text null` — non-null only when the most recent fetch attempt for this symbol failed, so `fetched_at` stays trustworthy as "last successful fetch," not "last attempt"
- `fetched_at timestamptz not null`

No FK from `holding.price_lookup_symbol` into this table — it's shared/global and independent of any tenant's data. RLS stays **enabled** (not disabled) with `FOR SELECT TO authenticated USING (true)` and no write policy for any client role — only the Supabase **service-role key** (used server-side by the price-refresh cron route, which bypasses RLS by design) can write. This closes off any accidental-write bug from a client-side query using the wrong key.

**Cron mechanism** (implementation note for whichever ticket builds this): a Vercel Cron Job entry in `vercel.json` invoking a Next.js API route, protected by Vercel's auto-sent `CRON_SECRET` bearer token; the route fetches Finnhub + Metals.Dev→MetalpriceAPI-fallback and `UPSERT`s into `price_cache`. Vercel's Hobby tier caps cron jobs at once/day with ±59min timing precision (confirmed against Vercel's docs, 2026-07-15) — adequate for a net-worth tracker, not a trading app.

### Deletion & archival

- **Holding / Liability**: the normal "remove" action sets `archived_at`, keeping the row and its full Valuation History — required so portfolio-distribution-over-time and historical Net Worth trend charts stay accurate after a Holding is sold (a hard delete would retroactively erase its contribution to *past* distribution, not just current). Current Net Worth/distribution queries filter `WHERE archived_at IS NULL`; historical/trend queries ignore that filter and use every Valuation row regardless of archival state. True `DELETE` (cascading its Valuations via `on delete cascade`) is reserved for correcting a mistaken entry, not for representing a sale — not exposed as the primary "remove" action in the UI.
- **Asset Class / Liability Class**: `on delete restrict` from Holding/Liability — can't delete a class while any Holding/Liability, archived or not, still references it (archived rows still need their class for historical grouping).
- **Target Allocation / Projection**: `on delete cascade` — current-state settings only, no historical significance.
- No soft-delete/undo window anywhere else — hard delete elsewhere is final, consistent with ADR 0003's stance against ledger/audit-trail complexity. (`archived_at` above is a status flag for a live feature requirement, not a reintroduction of that complexity.)

### CONTEXT.md updates made alongside this ticket

- **Portfolio**: clarified it's also the anchor for account-level settings (home currency, Target Allocation, Projection), and that Liability is scoped through it without being conceptually "inside" the Portfolio.
- **Net Worth**: clarified it's computed by converting each Valuation to the home currency using that Valuation's own stored FX rate.
- **Live Estimate** (new term): the real-time `quantity × price_cache.price` computation for live-priced Holdings, explicitly distinct from Valuation (never persisted, display-only) — added to prevent exactly the ambiguity CONTEXT.md's existing "Valuation" avoid-list was already guarding against.

### Amendment (from [Projection method](04-projection-method.md))

The `liability` table gains six new nullable columns, all optional (a Liability with none of them filled in keeps the flat-balance behavior this ticket originally assumed):

- `interest_rate numeric null`
- `original_loan_amount numeric null`
- `term_months int null`
- `custom_monthly_payment numeric null` — overrides the payment derived from the three fields above, when set
- `extra_monthly_payment numeric null default 0`
- `start_date date null` — display-only, not read by any formula
- `linked_holding_id uuid null references holding(id)` — optional pairing to the Holding a loan financed, for a combined Projected Net Position view

See that ticket's Answer for the amortization-payoff formula these fields feed.

### Amendment (from [Projection formula reconciliation](07-projection-formula-reconciliation.md))

One further nullable column on `liability`:

- `escrow_portion numeric null default 0` — the part of a statement payment that is property tax / insurance / PMI. Subtracted when a paid-off loan's freed payment is redirected into the Projection's monthly contribution, since escrow doesn't stop at payoff. Not read by the payoff formula itself.

### ADR candidate (offered, not yet created)

The archive-not-delete decision for Holding/Liability is hard to reverse once data exists, surprising without this context (a future reader would likely "clean up" `archived_at` toward a simpler hard-delete), and the result of a real trade-off (historical accuracy vs. schema simplicity) — a candidate for ADR 0004 if the user wants it recorded.

### Amendment (from [Target Net Worth](11-target-net-worth.md))

The `projection` row gains three columns:

- `target_amount numeric null` — the Target Net Worth figure, in today's purchasing power
- `target_date date null` — when the User wants to reach it (nullable together with `target_amount`; a Projection without a Target is valid)
- `inflation_rate numeric null default 0.03` — the assumption used to deflate the nominal projection for display

Exactly one Target per Projection, hence columns rather than a child table — see that ticket for why several targets were rejected.

### Amendment (from [Itemized contributions](12-itemized-contributions.md))

`projection` gains one column:

- `contribution_escalation_rate numeric null default 0` — expected annual growth in the monthly contribution. Contribution growth, not salary growth (a user may raise savings more slowly than pay).

`monthly_contribution` **stays a scalar**. The `contribution_line` child table that ticket originally proposed was rejected — see its Answer.
