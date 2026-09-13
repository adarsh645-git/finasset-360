Type: build
Status: resolved

# 16: Empty and first-run states

**What to build:** The surfaces no prototype ever exercised — every one was populated with fictional data. A new User with nothing recorded should find a starting point, not a dead end: the Portfolio explains what to do next rather than showing an empty grid, a Net Worth of zero reads as "nothing recorded yet" rather than as a real zero, and the Plan page explains that it needs Holdings before it can project anything.

The user stories state the requirement; the design is genuinely not settled, so this ticket decides it.

Spec: [`docs/SPEC.md`](../../../docs/SPEC.md) — user stories 116–119.

**Blocked by:** 09, 10.

- [x] Portfolio with no Holdings: an explanatory starting point, not an empty grid — decided the trigger is `netWorth.asOfDate === null` (nothing ever recorded for any active Holding *or* Liability), not "no Holdings" literally: a Liability recorded before any Holding still has a real Net Worth and staleness to show, and gating on Holdings alone would have hidden that real data behind the empty-state message (caught in code review)
- [x] Net Worth of zero reads as "nothing recorded yet", never as a computed zero — `NetWorthHero`/`NetWorthStrip` both branch on `asOfDate === null`
- [x] Plan page with no Holdings explains what it needs rather than charting nothing — `ProjectionSection` blocks only when there's neither a Holding nor a Liability to project, for the same reason as above
- [x] A Holding with exactly one Valuation renders on the timeline and sparkline without breaking — already handled by existing code (`Sparkline`'s single-point branch, `NetWorthTimelineChart`'s `allValues.length < 2` fallback); locked in with regression tests
- [x] Target Allocation editor with no Asset Classes yet, and distribution bars with no Holdings — the editor's no-Asset-Classes case was already handled; the distribution bars' dead `distribution.length === 0` check (unreachable, since the 5 global default Asset Classes always exist) was replaced with a shared `hasDistributionData` helper keyed on whether anything's actually been valued
- [x] Check-in started with nothing to check in on — already handled by existing code (`CheckInFlow`'s empty-queue branch)
- [x] Staleness list with nothing stale — already handled by existing code (`StalenessList`'s empty-items branch)
- [x] Test: each empty surface renders without error against a freshly created Portfolio — `tests/unit/empty-portfolio-render.test.tsx`, a new smoke-test seam using `renderToStaticMarkup` (no jsdom/testing-library added) against a fresh-Portfolio fixture (the 5 default Asset Classes, zero Holdings/Liabilities), including the Liability-only and single-Valuation regression cases above
