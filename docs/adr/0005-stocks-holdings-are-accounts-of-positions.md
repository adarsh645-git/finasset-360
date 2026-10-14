# Stocks Holdings are accounts of current-state Positions

A Stocks Holding is a brokerage account holding Positions (ticker, shares, average cost), and its value and Cost Basis are computed from them. It is no longer one Holding per ticker. Positions keep only their current state: editing overwrites them, and no trades or dated position records are kept. This amends ADR 0003 in one way: Cost Basis is now in the model, as a current figure (average cost on each Position, an optional cost on other Holdings), because the redesign shows gains throughout. The trade ledger stays out.

## Consequences

Past share counts are unknown, so a Stocks Holding's history can never be rebuilt from historical prices. It comes only from recorded Valuations of its total (see ADR 0008). Only Stocks has Positions; crypto is a single entered value.

Decided in [A Holding is an account that holds Positions?](https://github.com/adarsh645-git/finasset-360/issues/1).

## Status

accepted
