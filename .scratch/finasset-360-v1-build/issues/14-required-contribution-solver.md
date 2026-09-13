Type: build
Status: resolved

# 14: Required Contribution solver

**What to build:** The number this month's decision actually turns on: what the User would need to contribute monthly to hit their Target on its date. Always paired with the date they'd reach it at their *current* contribution, so an implausibly large figure still tells them something useful.

Future value is **linear** in the starting contribution — confirmed on the sample, where `f(1000) − f(0)` and `f(2000) − f(1000)` are both exactly 384,199 — so this is one subtract and one divide, no iteration:

```
C₀ = (target − f(0)) / slope
```

`f(0)` is the projection run with zero contribution; `slope` is ∂(real Net Worth at the target date)/∂C₀.

**Escalation is held as an input, not solved for.** It is a forecast about one's future self rather than a lever anyone can pull — solving for it yields answers like "you need 11% annual raises". It is also the only variable the linearity result covers: future value is *not* linear in the escalation rate. The date isn't solved for either; it falls out of ticket 13's gap display for free.

The solver runs against the **real** line, which makes the honest figure roughly **2.6× the nominal one** — 16,893/mo rather than 6,425/mo for the sample's 6M-by-2046 target. That is the single largest practical consequence of the real-dollar decision and is exactly why the nominal basis was rejected.

Spec: [`docs/SPEC.md`](../../../docs/SPEC.md) — user stories 91–95.

**Blocked by:** 13.

- [x] Closed-form solve, no iteration, against the real line
- [x] Derived live, never persisted — no schema change from this ticket
- [x] Display always pairs the figure with the achievable date: *"you'd need 16,893/mo — or at your current 7,400/mo you reach 6M in 2051"* — including the headroom case, caught in review: an earlier draft left that branch as a bare figure
- [x] **No unreachability threshold.** The result is never infinite or undefined — a one-year horizon yields 457,517/mo, absurd but finite and positive. Any plausibility constant would be a tuned guess that is wrong for someone. A target date this year or already passed leaves zero full years for a monthly contribution to act on, which would otherwise divide by a zero slope (`Infinity`/`NaN`) — caught in review, fixed by flooring the solver's own horizon at one year, the spec's own worked extreme case, distinct from `computeTargetGap`'s floor at zero
- [x] A required figure below the current contribution reads as headroom
- [x] A negative result is shown as **withdrawal capacity**, not clamped or suppressed
- [x] A negative contribution still escalates — a −48/mo figure at 5% escalation is a withdrawal *rising* 5% a year. Correct drawdown behaviour, but it silently repurposes a field the User set meaning "my savings will grow", so it must be **explicitly labelled**. Do not re-solve at 0% escalation when negative: that computes the displayed number under different assumptions depending on which side of zero it falls, kinking the curve at the crossing
- [x] Recomputed whenever assumptions or the Target change, so it never disagrees with the chart beside it
- [x] Test: linearity asserted directly — equal deltas across equal contribution steps
- [x] Test: solving against the real line, since solving against nominal is the error this decision exists to prevent
- [x] Test: a negative result survives with escalation applied rather than being clamped
