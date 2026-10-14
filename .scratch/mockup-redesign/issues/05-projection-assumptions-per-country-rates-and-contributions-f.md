> Snapshot of [#5](https://github.com/adarsh645-git/finasset-360/issues/5). The GitHub issue is canonical.

# Projection assumptions: per-Country rates, and contributions' fate

Type: grilling
State: open
Blocked by: #2, #3

## Question

The mockup's Projection has per-Country inflation, real estate, stocks and cash rates, shared crypto, metals and other rates, monthly compounding, loans amortizing by EMI, FX held flat, and "today's dollars" as each Country's series deflated at its own inflation. It has **no** monthly contribution, escalation, or freed-payment roll-in. Today's engine (`src/lib/projection/engine.ts`, test seam 1) has one growth rate, a monthly contribution with escalation, one inflation rate, and a horizon.

Decide:
- whether contributions and escalation are dropped (the mockup's default) or kept as an extra input on the Growth assumptions card;
- the assumptions storage shape (per User × Country × class) and the defaults (US 3/4/7/3.5, IN 5/6/11/6.5, common 5/4/−9);
- the horizon (the mockup's `projectionYears`, default 10) and where it is set;
- whether the engine is rewritten or extended, keeping it a pure function under test.

**Blocked by:** #2, #3.
