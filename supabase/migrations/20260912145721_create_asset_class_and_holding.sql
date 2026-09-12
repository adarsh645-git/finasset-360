-- Ticket 03: Asset Classes and Holdings in the Miller shell
--
-- `asset_class` and `liability_class` are deliberately separate tables of
-- identical shape rather than one table with a `kind` discriminator (see
-- docs/SPEC.md) — this migration only adds `asset_class`, since Liabilities
-- are a later ticket. A NULL `owner_id` is a global default shipped with the
-- app and visible to everyone; a non-null one is a single User's custom
-- class, invisible to every other User.

create table public.asset_class (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.asset_class enable row level security;

-- Global defaults are readable by everyone and editable by nobody at the
-- row level (docs/SPEC.md's RLS policies section) — SELECT allows both, but
-- INSERT/UPDATE/DELETE all require owner_id = auth.uid(), which a NULL
-- owner_id can never satisfy.
create policy "asset_class_select_visible"
  on public.asset_class
  for select
  to authenticated
  using (owner_id is null or owner_id = auth.uid());

create policy "asset_class_insert_own"
  on public.asset_class
  for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "asset_class_update_own"
  on public.asset_class
  for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "asset_class_delete_own"
  on public.asset_class
  for delete
  to authenticated
  using (owner_id = auth.uid());

-- `holding` — ticket 03's shape only: name, Asset Class, currency. Later
-- tickets add price_lookup_symbol/quantity (07, Live Estimates) and
-- archived_at (06, archival) — adding them now would be schema for a
-- feature this ticket doesn't build.
create table public.holding (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  asset_class_id uuid not null references public.asset_class (id) on delete restrict,
  name text not null,
  currency char(3) not null,
  created_at timestamptz not null default now()
);

alter table public.holding enable row level security;

create policy "holding_select_own"
  on public.holding
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "holding_insert_own"
  on public.holding
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "holding_update_own"
  on public.holding
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "holding_delete_own"
  on public.holding
  for delete
  to authenticated
  using (user_id = auth.uid());

-- Global default Asset Classes (user stories 6, 11; CONTEXT.md's own
-- examples for the term). Fixed ids so the app's icon map
-- (src/lib/asset-classes/defaults.ts) can key single-stroke icons to a
-- known default rather than to a name a User could rename. Any id outside
-- this set — every custom class — falls back to the neutral glyph as the
-- normal path, per this ticket's checklist.
insert into public.asset_class (id, owner_id, name) values
  ('a0000000-0000-0000-0000-000000000001', null, 'Real Estate'),
  ('a0000000-0000-0000-0000-000000000002', null, 'Equity'),
  ('a0000000-0000-0000-0000-000000000003', null, 'Precious Metal'),
  ('a0000000-0000-0000-0000-000000000004', null, 'Cash'),
  ('a0000000-0000-0000-0000-000000000005', null, 'Crypto');
