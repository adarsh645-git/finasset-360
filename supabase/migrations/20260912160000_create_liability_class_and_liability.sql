-- Ticket 05: Liabilities, and Net Worth nets them
--
-- `liability_class` mirrors `asset_class` exactly — a deliberately separate
-- table, not one table with a `kind` discriminator, which would let a
-- foreign key point a Holding at a Liability Class or need a trigger to
-- prevent it (see docs/SPEC.md). Same NULL-owner-means-global-default rule.

create table public.liability_class (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.liability_class enable row level security;

create policy "liability_class_select_visible"
  on public.liability_class
  for select
  to authenticated
  using (owner_id is null or owner_id = auth.uid());

create policy "liability_class_insert_own"
  on public.liability_class
  for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "liability_class_update_own"
  on public.liability_class
  for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "liability_class_delete_own"
  on public.liability_class
  for delete
  to authenticated
  using (owner_id = auth.uid());

-- `liability` — this ticket's shape only: name, Liability Class, currency,
-- mirroring `holding`'s ticket-03 shape. Amortization Assumptions
-- (interest_rate, original_loan_amount, term_months, custom_monthly_payment,
-- extra_monthly_payment, escrow_portion, start_date) and linked_holding_id
-- are ticket 11's fields — adding them now would be schema for a feature
-- this ticket doesn't build.
create table public.liability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  liability_class_id uuid not null references public.liability_class (id) on delete restrict,
  name text not null,
  currency char(3) not null,
  created_at timestamptz not null default now()
);

alter table public.liability enable row level security;

create policy "liability_select_own"
  on public.liability
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "liability_insert_own"
  on public.liability
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "liability_update_own"
  on public.liability
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "liability_delete_own"
  on public.liability
  for delete
  to authenticated
  using (user_id = auth.uid());

-- Global default Liability Classes (user stories 8, 16; CONTEXT.md's own
-- examples for the term: "Mortgage, Auto Loan, Credit Card, etc."). Fixed
-- ids, same reasoning as the Asset Class defaults: the icon map
-- (src/lib/liability-classes/defaults.ts) keys single-stroke icons to a
-- known default rather than to a renameable name, so any id outside this
-- set — every custom class — falls back to the neutral glyph as the normal
-- path.
insert into public.liability_class (id, owner_id, name) values
  ('b0000000-0000-0000-0000-000000000001', null, 'Mortgage'),
  ('b0000000-0000-0000-0000-000000000002', null, 'Auto Loan'),
  ('b0000000-0000-0000-0000-000000000003', null, 'Credit Card');
