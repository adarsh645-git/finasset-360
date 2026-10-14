# Live-priced values, dated Valuations, and FX by date

Live Estimate is retired. A Stocks Holding's current value is always computed live (shares × latest price). Its history comes from Valuations recorded on every save and automatically each day after prices refresh. Every other Holding and every Liability has dated Valuations, at most one per day, entered by the User. History between Valuations is interpolated.

FX is no longer frozen on each Valuation. Current values convert at today's FX Rate, and a past value converts at the FX Rate on its date, read from one shared daily rate table. That is what makes the Currency effect computable (FX then vs FX now). Everything rolls up to USD, so the home currency is gone. This amends ADR 0003; the "no ledger" rule stands.

## Consequences

Past USD figures always depend on the rate table, not on what was captured at recording. Automatic Stocks Valuations only start when the new model ships, so Stocks history before that can never be rebuilt.

Decided in [How a Holding's value is known, and the USD roll-up](https://github.com/adarsh645-git/finasset-360/issues/4).

## Status

accepted
