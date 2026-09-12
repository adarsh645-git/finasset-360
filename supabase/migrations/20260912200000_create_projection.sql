-- Ticket 10: Projection: growth, contribution, escalation
--
-- `projection` — singleton per Portfolio, `user_id` primary key, holding the
-- assumption set the engine runs on (docs/SPEC.md's schema section). This
-- ticket's shape only: growth_rate, monthly_contribution,
-- contribution_escalation_rate, horizon_years. `target_amount`,
-- `target_date` (ticket 13) and `inflation_rate` (ticket 12) are later
-- tickets' fields — adding them now would be schema for a feature this
-- ticket doesn't build, mirroring how ticket 05 held back Amortization
-- Assumptions on `liability`.
--
-- No `created_at`: same reasoning as `target_allocation` — a current-state
-- setting with no history of its own. Rates are stored as decimal fractions
-- (0.07, not 7), matching `inflation_rate`'s documented default of 0.03.
-- There's no row until a User has saved the form at least once — unlike
-- `portfolio`, nothing auto-creates one, since there's no meaningful default
-- growth rate or horizon to seed it with.

create table public.projection (
  user_id uuid primary key references auth.users (id) on delete cascade,
  growth_rate numeric not null,
  monthly_contribution numeric not null default 0,
  contribution_escalation_rate numeric null default 0,
  horizon_years integer not null
);

alter table public.projection enable row level security;

create policy "projection_select_own"
  on public.projection
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "projection_insert_own"
  on public.projection
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "projection_update_own"
  on public.projection
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "projection_delete_own"
  on public.projection
  for delete
  to authenticated
  using (user_id = auth.uid());
