-- Ticket 09: Target Allocation and the Plan page
--
-- A current-state goal percent per Asset Class (docs/SPEC.md's schema
-- section) — keyed on the pair itself rather than a surrogate id, since a
-- User has at most one target per Asset Class. `on delete cascade` from
-- both auth.users and asset_class: a Target Allocation has no historical
-- significance of its own (spec's "Deletion and archival" section), so
-- deleting the User or the Asset Class it targets should simply remove it
-- rather than orphaning a row or blocking the delete.
--
-- No `created_at`, unlike every Valuation/Holding/Liability table: this row
-- is a current-state setting with no history to date (same reasoning as
-- `projection`, docs/SPEC.md's other settings-only table), and the schema
-- section reproduces exactly these three columns as the contract.

create table public.target_allocation (
  user_id uuid not null references auth.users (id) on delete cascade,
  asset_class_id uuid not null references public.asset_class (id) on delete cascade,
  target_percent numeric not null,
  primary key (user_id, asset_class_id)
);

alter table public.target_allocation enable row level security;

create policy "target_allocation_select_own"
  on public.target_allocation
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "target_allocation_insert_own"
  on public.target_allocation
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "target_allocation_update_own"
  on public.target_allocation
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "target_allocation_delete_own"
  on public.target_allocation
  for delete
  to authenticated
  using (user_id = auth.uid());
