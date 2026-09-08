Type: build
Status: ready-for-agent

# 16: Empty and first-run states

**What to build:** The surfaces no prototype ever exercised — every one was populated with fictional data. A new User with nothing recorded should find a starting point, not a dead end: the Portfolio explains what to do next rather than showing an empty grid, a Net Worth of zero reads as "nothing recorded yet" rather than as a real zero, and the Plan page explains that it needs Holdings before it can project anything.

The user stories state the requirement; the design is genuinely not settled, so this ticket decides it.

Spec: [`docs/SPEC.md`](../../../docs/SPEC.md) — user stories 116–119.

**Blocked by:** 09, 10.

- [ ] Portfolio with no Holdings: an explanatory starting point, not an empty grid
- [ ] Net Worth of zero reads as "nothing recorded yet", never as a computed zero
- [ ] Plan page with no Holdings explains what it needs rather than charting nothing
- [ ] A Holding with exactly one Valuation renders on the timeline and sparkline without breaking
- [ ] Target Allocation editor with no Asset Classes yet, and distribution bars with no Holdings
- [ ] Check-in started with nothing to check in on
- [ ] Staleness list with nothing stale
- [ ] Test: each empty surface renders without error against a freshly created Portfolio
