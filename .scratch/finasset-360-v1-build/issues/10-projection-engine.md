Type: build
Status: resolved

# 10: Projection: growth, contribution, escalation

**What to build:** The forward-looking half. The User sets one annual growth rate, one monthly contribution, an annual escalation rate and a horizon, and sees a projected Net Worth line extending from their recorded history at the Today seam.

**Test seam 1 lands here** — the engine is one module taking plain data and returning plain data, with no I/O. Every later projection ticket extends it.

The decision this ticket must not get wrong: **Holdings are projected, Liabilities are projected separately, and the two are netted at each future point.** The projection never grows an already-netted Net Worth figure. Growing a netted figure implicitly compounds every debt at the Portfolio's equity growth rate — on the effort's sample data that grew a mortgage to 1,357,184 two years *after* its scheduled payoff and tripled a credit-card balance, and decisively made loan details **decorative**: filling them in moved the Net Worth line by exactly zero. The two readings differ by 1,404,690 at year 20 on the same data.

Core growth is monthly-compounding future value of a lump sum plus an ordinary annuity, contributions credited end-of-month:

```
FV = P(1+r)^n + C·[((1+r)^n − 1) / r]
```

`P` is the **Holdings total**, `r` is the annual rate over 12, `n` is months.

`C` is **piecewise-constant, not constant** — it steps at each escalation year (and, from ticket 11, at each loan payoff), so the projection is a chain of closed-form segments rather than one evaluation:

```
FV₁ = P·(1+r)^n₁ + C₁·[((1+r)^n₁ − 1) / r]
FV₂ = FV₁·(1+r)^n₂ + C₂·[((1+r)^n₂ − 1) / r]
…
```

Still deterministic and closed-form; no simulation, no per-month iteration.

Spec: [`docs/SPEC.md`](../../../docs/SPEC.md) — user stories 62, 67–73, 77–79, 114–115.

**Blocked by:** 05, 06, 09.

- [x] `projection` is a singleton per Portfolio (`user_id` primary key) holding assumptions only — one active set, not multiple named scenarios
- [x] Growth rate, `monthly_contribution` (a **scalar**), `contribution_escalation_rate` defaulting to **0**, horizon in years
- [x] Helper text on the contribution field prompting for the employer match (the single largest thing people forget, worth 9%)
- [x] The engine is a pure module: plain data in, plain data out, no I/O, with an injected "today"
- [x] Holdings total projected; each Liability projected on its own rule; netted per year. **Liabilities with no loan details are held exactly flat** — the projection invents no payoff schedule the User never entered. (No Liability has loan details yet — those fields are ticket 11's — so "held flat" is this ticket's entire Liability behavior.)
- [x] Nothing is persisted: the trajectory is derived live, like Net Worth itself
- [x] Ad-hoc projection of a single Holding's value (no contribution allocation — contributions are portfolio-level) — shown in HoldingDetailPanel
- [x] Projected line on the timeline with a Today seam; assumptions block on the Plan page — the dashboard's timeline gets the same treatment, reading the last-saved assumption set
- [x] The projection recomputes live as an assumption is edited, without blanking the pane
- [x] Test: the closed form matches an independent **month-by-month simulation** to a stated tolerance. Ticket 12 of the planning effort verified agreement to 1×10⁻⁷ across 21 segments — carry that simulation in as a reference implementation, not as a recorded snapshot of the code's own output
- [x] Test: segmentation from escalation, asserted across a multi-segment case
- [x] Test: a Liability with no Amortization Assumptions stays exactly flat across the horizon
- [x] Test: degenerate inputs — zero horizon, **zero growth (which divides by `r`)**, no Liabilities, no Holdings
