-- Ticket 01: Sign in, get a Portfolio
--
-- `portfolio` is the per-User anchor row: user_id doubles as the primary key,
-- so there is no separate `users`/`profiles` table (see docs/SPEC.md and
-- docs/CONTEXT.md). A trigger on auth.users creates this row automatically on
-- first sign-in, so the app never shows a setup wizard before recording
-- anything, and a User's own re-sign-in never creates a second row (Supabase
-- Auth only inserts into auth.users once per identity).

create table public.portfolio (
  user_id uuid primary key references auth.users (id) on delete cascade,
  home_currency char(3) not null default 'USD',
  created_at timestamptz not null default now()
);

alter table public.portfolio enable row level security;

create policy "portfolio_select_own"
  on public.portfolio
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "portfolio_insert_own"
  on public.portfolio
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "portfolio_update_own"
  on public.portfolio
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "portfolio_delete_own"
  on public.portfolio
  for delete
  to authenticated
  using (user_id = auth.uid());

-- Auto-create a Portfolio the moment a new auth identity is created. Runs as
-- the function owner (postgres), bypassing RLS, which is correct here: the
-- row being created belongs to the very user who doesn't exist as
-- `auth.uid()` yet at trigger time in every edge case (e.g. admin-created
-- users). `on conflict do nothing` makes this idempotent if it's ever
-- invoked twice for the same id.
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
