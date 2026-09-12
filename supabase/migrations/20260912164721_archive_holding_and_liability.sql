-- Ticket 06: History, staleness, and archival
--
-- Adds `archived_at` to `holding` and `liability` (docs/SPEC.md's schema
-- section already specifies this column; this is the migration that
-- actually adds it). NULL means active. The "remove" action in the UI sets
-- this rather than deleting the row, preserving Valuation History so past
-- distribution and Net Worth stay accurate for the period the Holding was
-- owned (user stories 18-20) — a true DELETE remains available separately
-- for correcting a mistaken entry (user story 21).
--
-- No index: RLS already scopes every query to `user_id = auth.uid()`, and a
-- single User's row count is small enough that filtering `archived_at is
-- null` over their own rows needs no extra index (ADR 0003's "not a
-- high-QPS service" reasoning applies here too).

alter table public.holding add column archived_at timestamptz null;
alter table public.liability add column archived_at timestamptz null;
