> Snapshot of [#1](https://github.com/adarsh645-git/finasset-360/issues/1). The GitHub issue is canonical.

# A Holding is an account that holds Positions?

Type: grilling
State: open
Blocked by: none

## Question

The mockup's `Holding` is a **brokerage account** ("Fidelity Brokerage") holding many **Positions** (ticker, shares, avg cost). Its value is Σ shares × price and its cost is Σ shares × avgCost. Today a Holding is one market symbol ("10 shares of AAPL") with `quantity`, `price_lookup_symbol`, `sector` and `held_at`, and the same ticker can appear as several Holdings across brokerages.

Decide:
- whether a stocks Holding becomes an account of Positions, and whether Positions exist for crypto too (the mockup treats crypto as a single-value asset);
- what a Position is in the domain (add it to CONTEXT.md; "position" is currently on Holding's _Avoid_ list);
- whether a Position records a history (shares changing over time) or only its current state. This feeds the stocks value history in 04;
- metals: the mockup's `units` + `unit` (`g` / `oz t`) vs today's quantity + metal symbol;
- real estate's `ptype` and `city` fields, and the generic `sub` description;

Record the decision and any ADR (a change of the core aggregate likely qualifies).

**Blocked by:** none.
