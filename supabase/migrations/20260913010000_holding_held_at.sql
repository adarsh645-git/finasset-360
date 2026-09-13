-- Ticket 19: "Held at" field on a Holding
--
-- A freeform label for where a Holding is held (a brokerage, a bank, an
-- exchange, "at home," etc.) — independent of `price_lookup_symbol`, so it
-- applies to every Asset Class (a Cash Holding at "Chase Checking" needs
-- this exactly as much as an Equity Holding in a Fidelity 401k), not just
-- ones with a market symbol. Not named `account` — that word is CONTEXT.md's
-- reserved term for the User's own login concept.
alter table public.holding add column held_at text null;
