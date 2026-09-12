-- Ticket 05: Liabilities, and Net Worth nets them
--
-- `liability_valuation` mirrors `holding_valuation` exactly — a separate
-- table rather than a polymorphic one, since a plain foreign key cannot
-- target one of two tables and the alternatives (nullable pairs, an
-- (owner_type, owner_id) pair) surrender real referential integrity (see
-- docs/SPEC.md). Recording a Liability's balance works identically to
-- recording a Holding's value: same FX-at-recording capture, same
-- unique (liability_id, recorded_at) same-day-correction rule.

create table public.liability_valuation (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  liability_id uuid not null references public.liability (id) on delete cascade,
  amount numeric not null,
  fx_rate_to_home numeric not null,
  home_currency_at_recording char(3) not null,
  recorded_at date not null,
  created_at timestamptz not null default now(),
  unique (liability_id, recorded_at)
);

alter table public.liability_valuation enable row level security;

create policy "liability_valuation_select_own"
  on public.liability_valuation
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "liability_valuation_insert_own"
  on public.liability_valuation
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "liability_valuation_update_own"
  on public.liability_valuation
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "liability_valuation_delete_own"
  on public.liability_valuation
  for delete
  to authenticated
  using (user_id = auth.uid());
