-- Ticket 18: Stock-picker autocomplete with sector
--
-- `stock_symbol` mirrors `price_cache`'s shape (docs/SPEC.md): one
-- non-tenant-scoped, globally-shared table, RLS enabled with a select-only
-- policy so every authenticated User can read it but only the service-role
-- key (the weekly refresh cron route) can write `symbol`/`name`/`type`.
-- `sector` is the one column that cron route never touches — `null` means
-- "never looked up yet", and it's written instead by the per-symbol lazy
-- lookup route the first time a User selects that symbol (a resolved-but-
-- blank industry from Finnhub is cached as `''`, distinct from `null`, so
-- it isn't retried on every selection).
create table public.stock_symbol (
  symbol text primary key,
  name text not null,
  type text not null,
  sector text null,
  updated_at timestamptz not null
);

alter table public.stock_symbol enable row level security;

create policy "stock_symbol_select_authenticated"
  on public.stock_symbol
  for select
  to authenticated
  using (true);

-- Sector is purely descriptive (CONTEXT.md) — set once, lazily, on first
-- selection through the stock-picker; a manually-entered Holding never gets
-- one.
alter table public.holding add column sector text null;
