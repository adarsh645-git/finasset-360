-- Ticket 12: Inflation — nominal and real, both charted
--
-- Adds `inflation_rate` to `projection` (ticket 10's migration deliberately
-- left it out — "adding them now would be schema for a feature this ticket
-- doesn't build"), exactly as docs/SPEC.md's schema section already
-- specifies: `numeric null default 0.03`, mirroring
-- `contribution_escalation_rate`'s own nullable-with-default column — the
-- app-level type (`ProjectionAssumptions.inflation_rate: number`) treats it
-- as always-present. Defaults to 0.03 so a meaningful answer exists before
-- the User has thought about it (user story 81) — though since there's no
-- row until a User has saved the form at least once, the default only
-- matters the moment they do.

alter table public.projection
  add column inflation_rate numeric null default 0.03;
