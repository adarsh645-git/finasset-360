-- Ticket 13: Target Net Worth and the gap
--
-- Adds `target_amount` and `target_date` to `projection`, nullable
-- together — a Projection without a Target is valid (docs/SPEC.md's schema
-- section already names both columns). Exactly one Target per User, which
-- is why these are columns on the singleton row rather than a child table
-- (ticket 11 of the planning effort: several would force the solver to pick
-- which to solve for). No CHECK constraint enforcing "both or neither" —
-- the app layer (readAssumptions in src/app/api/projection/route.ts) is
-- what actually writes them together, mirroring how contribution_escalation
-- and inflation aren't enforced to move together either.

alter table public.projection
  add column target_amount numeric null,
  add column target_date date null;
