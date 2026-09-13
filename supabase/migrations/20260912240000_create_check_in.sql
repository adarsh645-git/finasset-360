-- Ticket 08: Check-in mode
--
-- `check_in` is an append-only log of completed Check-in passes (user story
-- 46): one row per pass, carrying the Net Worth *as computed by the server
-- at that moment* rather than a value the client hands in — the same
-- POST /api/check-in request that inserts a row also reads the previous row
-- to answer "what's the delta", so the figure a later pass diffs against is
-- never something a client could desync from what was actually recorded.
--
-- No `update`/`delete` policy: unlike `holding_valuation` (correctable via
-- same-day upsert) or the settings tables, a completed Check-in has no
-- correction concept anywhere in the spec, so this mirrors `price_cache`'s
-- narrower policy set rather than the four-policy default the rest of the
-- schema uses.

create table public.check_in (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  net_worth numeric not null,
  completed_at timestamptz not null default now()
);

alter table public.check_in enable row level security;

create policy "check_in_select_own"
  on public.check_in
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "check_in_insert_own"
  on public.check_in
  for insert
  to authenticated
  with check (user_id = auth.uid());
