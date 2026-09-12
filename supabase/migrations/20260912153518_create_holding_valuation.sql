-- Ticket 04: Record a Valuation, see Net Worth
--
-- `holding_valuation` carries the FX rate and home currency exactly as they
-- were at the moment of recording (docs/SPEC.md) — `fx_rate_to_home` and
-- `home_currency_at_recording` are written once by the API route and never
-- recomputed, so a later change to `portfolio.home_currency` cannot
-- retroactively alter a historical total. `user_id` is denormalized here
-- even though it's derivable through `holding_id`, purely so every RLS
-- policy in the schema stays a flat one-column check with no join, matching
-- `holding` and `asset_class`.
--
-- `recorded_at` is a `date`, not a `timestamptz` — sub-day precision isn't
-- meaningful for a periodic snapshot — and `unique (holding_id, recorded_at)`
-- is what turns a same-day re-record into an UPDATE of that row rather than
-- a second one (user story 25). Home-currency value is always computed on
-- read as `amount * fx_rate_to_home`; nothing here stores it.

create table public.holding_valuation (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  holding_id uuid not null references public.holding (id) on delete cascade,
  amount numeric not null,
  fx_rate_to_home numeric not null,
  home_currency_at_recording char(3) not null,
  recorded_at date not null,
  created_at timestamptz not null default now(),
  unique (holding_id, recorded_at)
);

alter table public.holding_valuation enable row level security;

create policy "holding_valuation_select_own"
  on public.holding_valuation
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "holding_valuation_insert_own"
  on public.holding_valuation
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "holding_valuation_update_own"
  on public.holding_valuation
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "holding_valuation_delete_own"
  on public.holding_valuation
  for delete
  to authenticated
  using (user_id = auth.uid());
