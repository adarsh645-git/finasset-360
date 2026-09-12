-- Ticket 07: Live Estimates from a shared price cache
--
-- `price_lookup_symbol`/`quantity` on `holding` are populated together
-- (enforced at the application layer, not a DB constraint — see the
-- holdings routes): a Holding without a symbol (a house) has neither and
-- therefore no Live Estimate, computed elsewhere as quantity × the latest
-- `price_cache` row for that symbol.
alter table public.holding add column price_lookup_symbol text null;
alter table public.holding add column quantity numeric null;

-- `price_cache` is the one non-tenant-scoped table (docs/SPEC.md): no
-- `user_id`, and deliberately no foreign key from
-- `holding.price_lookup_symbol` into it — the cache is global, keyed only
-- by `symbol`, and independent of any tenant's data. `last_error` is kept
-- separate from `fetched_at` specifically so `fetched_at` stays
-- trustworthy as *last successful fetch* rather than *last attempt*: a
-- failed refresh updates `last_error` and leaves the previous good price
-- and `fetched_at` untouched.
create table public.price_cache (
  symbol text primary key,
  price numeric not null,
  price_currency char(3) not null,
  source text not null,
  last_error text null,
  fetched_at timestamptz not null
);

alter table public.price_cache enable row level security;

-- RLS enabled, not disabled, precisely so no client-side write policy is
-- ever accidentally reachable. Every authenticated User can read every
-- row (the cache is shared, not per-tenant); only the service-role key —
-- used server-side by the cron refresh route — can write, because no
-- insert/update/delete policy exists for any client role.
create policy "price_cache_select_authenticated"
  on public.price_cache
  for select
  to authenticated
  using (true);
