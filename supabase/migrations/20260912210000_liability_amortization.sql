-- Ticket 11: Amortization Assumptions and payoff
--
-- Adds the Amortization Assumptions docs/SPEC.md's schema section already
-- specifies for `liability` (ticket 05's migration deliberately left these
-- out — "adding them now would be schema for a feature this ticket doesn't
-- build"). All optional: a Liability with none of them filled in is still
-- held flat by the Projection (user story 62).
--
-- `extra_monthly_payment`/`escrow_portion` default to 0 rather than meaning
-- "not entered yet" — both are added directly into arithmetic (the
-- redirect formula, `Payment = ... + extra_monthly_payment`), mirroring
-- `contribution_escalation_rate` on `projection` (nullable column, `numeric
-- null default 0`, but the app-level type treats it as always-present).
-- The rest have no sane default and stay NULL until the User fills them in.
--
-- `linked_holding_id` has no `on delete` action beyond the default
-- (`no action`/restrict): a Holding financed by a Liability shouldn't be
-- silently unlinked or block-deleted by that link — archiving is the normal
-- removal path for both sides (ticket 06), and a true delete of the Holding
-- is a deliberate, infrequent correction the User can re-point first.

alter table public.liability
  add column interest_rate numeric null,
  add column original_loan_amount numeric null,
  add column term_months int null,
  add column custom_monthly_payment numeric null,
  add column extra_monthly_payment numeric null default 0,
  add column escrow_portion numeric null default 0,
  add column start_date date null,
  add column linked_holding_id uuid null references public.holding (id);
