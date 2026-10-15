-- redesign-data-model, ticket 2: start fresh (design.md D1, D2 and the schema sketch).
--
-- Production holds only test data, so nothing is migrated: every old object
-- is dropped and the new schema is created in the same transaction. The
-- earlier migration files stay in history because production's migration
-- table already lists them.

-- 1. Drop every old object ------------------------------------------------

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

drop table if exists
  public.check_in,
  public.target_allocation,
  public.projection,
  public.liability_valuation,
  public.liability,
  public.liability_class,
  public.holding_valuation,
  public.holding,
  public.asset_class,
  public.stock_symbol,
  public.price_cache,
  public.portfolio
  cascade;

-- 2. Shared tables: readable by any signed-in User, writable by none ------

create table public.country (
  code text primary key,
  name text not null,
  currency char(3) not null,
  default_inflation numeric not null,
  default_realestate numeric not null,
  default_stocks numeric not null,
  default_cash numeric not null
);

insert into public.country
  (code, name, currency, default_inflation, default_realestate, default_stocks, default_cash)
values
  ('US', 'United States', 'USD', 3, 4, 7, 3.5),
  ('IN', 'India', 'INR', 5, 6, 11, 6.5);

create table public.stock_symbol (
  symbol text primary key,
  name text not null,
  type text not null,
  mic text null,
  sector text null,
  updated_at timestamptz not null,
  constraint stock_symbol_sector_check check (sector is null or sector in (
    'Technology', 'Financials', 'Healthcare', 'Energy', 'Consumer Discretionary',
    'Consumer Staples', 'Communication Services', 'Industrials', 'Utilities',
    'Materials', 'Real Estate', 'Other'))
);

create table public.price_cache (
  symbol text primary key,
  price numeric not null,
  currency text not null,
  fetched_at timestamptz not null,
  last_error text null
);

create table public.fx_rate (
  rate_date date primary key,
  inr_per_usd numeric not null check (inr_per_usd > 0),
  fetched_at timestamptz not null default now()
);

do $$
declare
  shared_table text;
begin
  foreach shared_table in array array['country', 'stock_symbol', 'price_cache', 'fx_rate'] loop
    execute format('alter table public.%I enable row level security', shared_table);
    execute format(
      'create policy %I on public.%I for select to authenticated using (true)',
      shared_table || '_select_authenticated', shared_table);
  end loop;
end $$;

-- 3. Per-User tables --------------------------------------------------------

create table public.portfolio (
  user_id uuid primary key references auth.users (id) on delete cascade,
  horizon_years integer null check (horizon_years between 1 and 40),
  savings_growth numeric null check (savings_growth between -50 and 50),
  crypto_rate numeric null check (crypto_rate between -50 and 50),
  metals_rate numeric null check (metals_rate between -50 and 50),
  other_rate numeric null check (other_rate between -50 and 50),
  created_at timestamptz not null default now()
);

create table public.country_assumption (
  user_id uuid not null references public.portfolio (user_id) on delete cascade,
  country text not null references public.country (code),
  inflation numeric null check (inflation between -50 and 50),
  realestate_rate numeric null check (realestate_rate between -50 and 50),
  stocks_rate numeric null check (stocks_rate between -50 and 50),
  cash_rate numeric null check (cash_rate between -50 and 50),
  monthly_savings numeric null check (monthly_savings >= 0),
  created_at timestamptz not null default now(),
  primary key (user_id, country)
);

create table public.holding (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.portfolio (user_id) on delete cascade,
  country text not null references public.country (code),
  asset_class text not null
    check (asset_class in ('realestate', 'stocks', 'cash', 'crypto', 'metals', 'other')),
  name text not null check (length(btrim(name)) > 0),
  description text null,
  cost_basis numeric null check (cost_basis >= 0),
  property_type text null
    check (property_type in ('Residential', 'Land', 'REIT / fund', 'Commercial')),
  city text null,
  quantity numeric null check (quantity > 0),
  unit text null check (unit in ('g', 'oz t')),
  archived_at timestamptz null,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  -- Class-specific fields belong to one class each (D3).
  constraint holding_property_type_iff_realestate
    check ((property_type is not null) = (asset_class = 'realestate')),
  constraint holding_city_realestate_only
    check (city is null or asset_class = 'realestate'),
  constraint holding_quantity_metals_only
    check ((quantity is null and unit is null) or asset_class = 'metals'),
  constraint holding_quantity_with_unit
    check ((quantity is null) = (unit is null)),
  -- A Stocks Holding's Cost Basis is computed from its Positions.
  constraint holding_stocks_has_no_cost_basis
    check (cost_basis is null or asset_class <> 'stocks')
);

create table public.position (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  holding_id uuid not null,
  ticker text not null check (length(btrim(ticker)) > 0),
  shares numeric not null check (shares > 0),
  avg_cost numeric not null check (avg_cost > 0),
  hand_price numeric null check (hand_price > 0),
  price_as_of date null,
  sector text not null default 'Other' check (sector in (
    'Technology', 'Financials', 'Healthcare', 'Energy', 'Consumer Discretionary',
    'Consumer Staples', 'Communication Services', 'Industrials', 'Utilities',
    'Materials', 'Real Estate', 'Other')),
  name text not null,
  created_at timestamptz not null default now(),
  unique (holding_id, ticker),
  constraint position_hand_price_with_date
    check ((hand_price is null) = (price_as_of is null)),
  foreign key (holding_id, user_id)
    references public.holding (id, user_id) on delete cascade
);

create table public.holding_valuation (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  holding_id uuid not null,
  valued_on date not null,
  value numeric not null check (value >= 0),
  source text not null check (source in ('user', 'cron')),
  created_at timestamptz not null default now(),
  unique (holding_id, valued_on),
  foreign key (holding_id, user_id)
    references public.holding (id, user_id) on delete cascade
);

create table public.liability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.portfolio (user_id) on delete cascade,
  country text not null references public.country (code),
  name text not null check (length(btrim(name)) > 0),
  principal numeric not null check (principal >= 0),
  apr numeric not null check (apr >= 0),
  monthly_payment numeric not null check (monthly_payment > 0),
  term_years numeric null check (term_years > 0),
  start_month date not null check (start_month = date_trunc('month', start_month)::date),
  revolving boolean not null default false,
  linked_holding_id uuid null,
  archived_at timestamptz null,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  -- Deleting the Holding only clears the link, never the owner (D9).
  foreign key (linked_holding_id, user_id)
    references public.holding (id, user_id) on delete set null (linked_holding_id)
);

-- At most one active loan per Holding (D9).
create unique index liability_one_active_loan_per_holding
  on public.liability (linked_holding_id)
  where archived_at is null and linked_holding_id is not null;

create table public.liability_valuation (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  liability_id uuid not null,
  valued_on date not null,
  balance numeric not null check (balance >= 0),
  created_at timestamptz not null default now(),
  unique (liability_id, valued_on),
  foreign key (liability_id, user_id)
    references public.liability (id, user_id) on delete cascade
);

create table public.goal (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.portfolio (user_id) on delete cascade,
  name text null,
  target_usd numeric not null check (target_usd > 0),
  created_at timestamptz not null default now()
);

-- 4. Row level security: each User sees and changes only their own rows ----

do $$
declare
  user_table text;
begin
  foreach user_table in array array[
    'portfolio', 'country_assumption', 'holding', 'position', 'holding_valuation',
    'liability', 'liability_valuation', 'goal'
  ] loop
    execute format('alter table public.%I enable row level security', user_table);
    execute format('create policy %I on public.%I for select to authenticated using (user_id = auth.uid())',
      user_table || '_select_own', user_table);
    execute format('create policy %I on public.%I for insert to authenticated with check (user_id = auth.uid())',
      user_table || '_insert_own', user_table);
    execute format('create policy %I on public.%I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      user_table || '_update_own', user_table);
    execute format('create policy %I on public.%I for delete to authenticated using (user_id = auth.uid())',
      user_table || '_delete_own', user_table);
  end loop;
end $$;

-- 5. A Portfolio for every new auth identity -------------------------------

-- Runs as the function owner (bypassing RLS) because the row belongs to a
-- User who isn't `auth.uid()` yet at trigger time. `on conflict do nothing`
-- keeps it idempotent.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.portfolio (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Users who signed in before this migration lose their Portfolio row with the
-- old table, so give each of them a blank one.
insert into public.portfolio (user_id)
select id from auth.users
on conflict (user_id) do nothing;
