Type: grilling
Status: resolved
Assignee: Adarsh Reddy

## Question

Given a Target Net Worth and a date, solve for the **required starting monthly contribution** — the number the user compares against the single contribution amount they actually enter.

Future value is *linear* in each contribution segment, so even with the escalation staircase and the loan-payoff staircase this stays a closed-form linear solve, no iteration. ~~Sample: hitting 6M by 2046 requires 6,425/mo flat, 5,069/mo at 3% escalation, 4,278/mo at 5%.~~ **(Those figures were computed against the nominal line and are superseded — see the Answer for the real-basis numbers, ~2.6× larger.)**

To settle:

- **What exactly is solved for.** Starting total contribution, with the escalation rate held fixed as an input? Or the escalation rate, with the contribution fixed? Only one variable can be solved at a time; picking which one is the decision. (Charting recommendation: starting contribution, because it's the number acted on this month.)
- **Unreachable targets.** If the required contribution exceeds anything plausible, or the target is unreachable at any contribution because the horizon is too short — what does the UI say? A negative or absurd number is worse than a refusal.
- **Already-met targets.** If the current trajectory already clears the target, the required contribution is *lower* than what the user is contributing, possibly negative (i.e. you could withdraw). Is that shown as slack, or suppressed?
- *(Removed — [Itemized contributions](12-itemized-contributions.md) rejected the line list, so there is nothing to apportion: the solver reports one number against the one number the user entered.)*
- **Dollar basis is settled**: [Target Net Worth](11-target-net-worth.md) fixed the Target in today's purchasing power, with the inflation-adjusted line as primary. The solver therefore solves against the **real** line, not the nominal one — which makes the required contribution materially larger than a nominal solve would suggest.

## Answer

### Correction to this ticket's own figures

The numbers in the Question were computed against the **nominal** line, before [Target Net Worth](11-target-net-worth.md) fixed the Target in today's purchasing power. Against the real line the solver returns roughly **2.6× more**:

| Escalation | Nominal basis (stale) | Real basis (correct) |
|---|---|---|
| Flat | 6,425/mo | **16,893/mo** |
| 3% | 5,069/mo | **13,326/mo** |
| 5% | 4,278/mo | **11,248/mo** |

This is the single largest practical consequence of the real-dollar decision, and worth stating loudly: the honest required contribution is far higher than the nominal one, which is exactly why the nominal basis was rejected.

### Solve for the starting contribution

**Confirmed linear**, so the solve is one subtract and one divide, no iteration: on the sample, `f(1000) − f(0)` and `f(2000) − f(1000)` are both exactly 384,199.

```
C₀ = (target − f(0)) / slope        where f(0) is the projection with zero contribution
                                    and slope = ∂(real net worth at target date)/∂C₀
```

**Escalation is held as an input, not solved for.** The starting contribution is the number acted on this month; an escalation rate is a forecast about one's future self, and solving for it yields answers like "you need 11% annual raises," which is not a lever anyone can pull. It is also the only variable the linearity result covers — future value is *not* linear in the escalation rate, so solving for that would require iteration.

**The date is not solved for either**, because it comes free: Target Net Worth already settled the gap display as a date first ("2051 — five years late"), read straight off the projection with no inversion.

### Implausible targets: pair the figure with the date, no threshold

The required contribution is **never infinite or undefined** — at a one-year horizon it is 457,517/mo, absurd but finite and positive. There is no mathematical unreachability, only implausibility, so thresholding is a choice rather than a necessity.

Display always pairs the two: *"you'd need 16,893/mo — or at your current 7,400/mo you reach 6M in 2051."* This degrades gracefully at every magnitude with no plausibility constant to tune (any such constant is wrong for someone), reuses machinery already built for the gap, and answers the question the user has next.

### Ahead of target: show it, including negative

Required *below* current contribution is headroom and is shown as such. Required *below zero* means the portfolio alone gets there without further contribution — on the sample this occurs at a 57-year horizon (−48/mo). It is displayed as **withdrawal capacity**, which is precisely the question someone in drawdown is asking. Not clamped, not suppressed.

**The sign-flip subtlety, decided:** a negative contribution still gets multiplied by the escalation rate, so a −48/mo figure at 5% escalation is a *withdrawal rising 5% a year*. That is correct drawdown behaviour against rising costs, but it silently repurposes a field the user set meaning "my savings will grow." **Accepted, with explicit labelling** — the alternative (re-solving at 0% escalation whenever the result is negative) computes the displayed number under different assumptions depending on which side of zero it falls, kinking the curve at the crossing and making the behaviour hard to explain and to test. Continuous and labelled beats discontinuous and silent.

### Not stored

The required contribution is **derived, never persisted** — computed live from the Projection's assumptions and the Target, exactly like Net Worth and the projection trajectory itself. No schema change from this ticket.
