> Snapshot of [#4](https://github.com/adarsh645-git/finasset-360/issues/4). The GitHub issue is canonical.

# How a Holding's value is known, and the USD roll-up

Type: grilling
State: open
Blocked by: #1

## Question

Today a Holding's value is a deliberately recorded **Valuation**, and a **Live Estimate** (quantity × cached price) is shown alongside it but never recorded. Net Worth converts each Valuation at the FX rate **captured when it was recorded**. The mockup instead:
- computes a stocks account's value live from positions × price;
- keeps a `valueLog` "logged whenever you update" for manual items;
- rolls everything up at **today's** FX rate (₹83.40/$);
- attributes change to asset growth, debt paid down and a **currency effect**, which needs FX *then* vs FX *now*.

Decide:
- whether the Live Estimate vs Valuation distinction survives, and what a stocks account's value history is made of (recorded snapshots? reconstructed from price history?);
- which FX rate converts current values (today's) and which converts history (the rate at each date, from Frankfurter's historical series, vs the stored `fx_rate_to_home`);
- how the change-attribution formula in the README sources fx_then and native_then;
- the CONTEXT.md updates to Valuation, Live Estimate, Net Worth and Portfolio (home currency → USD).

**Blocked by:** #1.
