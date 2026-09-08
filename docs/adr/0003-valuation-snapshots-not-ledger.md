# Valuation snapshots only, no transaction ledger

Holdings and Liabilities are tracked as periodic point-in-time Valuations (see CONTEXT.md), not as a full transaction ledger of individual buys/sells/deposits. This deliberately excludes cost basis and realized/unrealized capital gains tracking — the destination is a net-worth tracker and planner, not a trading journal or tax tool. Revisiting this later means introducing a new ledger concept alongside Valuation, not modifying it, since the two model different things.

## Status

accepted
