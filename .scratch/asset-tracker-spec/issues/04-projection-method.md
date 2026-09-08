Type: grilling
Status: resolved

## Question

Decide the exact calculation method for Projection: what assumptions does a Projection take as input (growth rate, contribution amount/frequency, timeline in years — anything else?), and what's the formula that turns those into a projected future Net Worth or Holding value? Per the settled decision, this is a single deterministic assumption set, not multiple named scenarios — so the method should be simple (e.g. standard compound-growth-with-contributions), not a simulation.

## Answer

### Core Projection: growth + contributions

- One flat, manually-entered **annual growth rate** and one flat **monthly contribution amount** apply to the whole Portfolio — not per-Asset-Class rates, not per-Holding contribution allocation. Nominal rate only, no inflation adjustment.
- Output is a **year-by-year trajectory** (a chart from year 1 to N), not a single terminal number — same formula re-evaluated at each year, no extra stored state.
- The stored `projection` row (schema already fixed by [Data-model schema](03-data-model-schema.md)) holds the assumption inputs only (growth rate, monthly contribution, horizon in years); the trajectory itself is always computed live from the Portfolio's current Net Worth, never stored — same pattern as Net Worth itself.
- The same formula/rate can also be applied ad hoc to a single Holding's current value (no contribution allocation, since contributions are portfolio-level) — satisfies CONTEXT.md's "Net Worth or Holding value" wording without needing a second stored assumption set.

**Formula** — standard monthly-compounding future value of a lump sum plus an ordinary annuity (contributions credited end-of-month):

```
FV = P(1+r)^n + C·[((1+r)^n − 1) / r]
```

- `P` = **Holdings total** (the sum of current Holding Valuations), or a single Holding's value for the ad-hoc case — **not** Net Worth
- `r` = monthly rate = annual growth rate / 12
- `n` = months = years × 12
- `C` = monthly contribution amount

**Projected Net Worth at year `y` = (Holdings projected to `y`) − (each Liability projected to `y`, summed).** Holdings and Liabilities are projected on *separate* rules and netted at each year; the projection never grows a netted figure. Amended by [Projection formula reconciliation](07-projection-formula-reconciliation.md) — the original wording said `P = current Net Worth`, which implicitly compounded every debt at the Portfolio's growth rate and made the Liability rules below unable to affect the Net Worth line at all.

**`C` is piecewise-constant, not constant** — it steps upward at each Liability payoff (see "Freed payments redirect into contributions" below). The projection is therefore a chain of closed-form segments, one per step, evaluated in payoff order:

```
FV₁ = P·(1+r)^n₁ + C₁·[((1+r)^n₁ − 1) / r]
FV₂ = FV₁·(1+r)^n₂ + C₂·[((1+r)^n₂ − 1) / r]     C₂ = C₁ + freed payment
…
```

Each segment ends at the next step; the final segment runs to the horizon. Still deterministic and closed-form — no simulation, no per-month iteration required.

`C` steps from **two** independent sources: loan payoffs (above) and the annual **contribution escalation rate** added by [Itemized contributions](12-itemized-contributions.md). They compose without interaction — a payoff landing mid-escalation-year simply splits that year into two segments. Verified numerically against a month-by-month simulation on the sample data: 21 segments, agreement to 1×10⁻⁷.

### Liabilities in the projection

Default: a Liability's balance is held **flat** at its latest recorded `liability_valuation` — it does not shrink or grow on its own.

Exception — **Amortization Assumptions** (new CONTEXT.md term): if a Liability has loan details filled in, it auto-amortizes forward from its *current recorded balance* (not the original loan amount — manual Valuation snapshots stay authoritative for "now," consistent with every other Valuation in this app) using a closed-form payoff formula. Capability-based, not restricted to the "Mortgage" Liability Class — any Liability (e.g. an Auto Loan) can opt in by filling in the fields.

**Required monthly payment** — two modes:
- **Derived** (default): from `original_loan_amount`, `interest_rate`, `term_months` via the standard amortization-payment formula: `M = L·[r(1+r)^t] / [(1+r)^t − 1]`.
- **Custom override**: `custom_monthly_payment`, used instead of the derived `M` when set — covers loans with escrow/PMI baked into the statement payment, or when the user doesn't know/have the original loan amount.

Either way, an optional flat recurring `extra_monthly_payment` (default 0) adds on top, to model early payoff.

**Payoff-balance formula**, projecting forward from today:

```
B(k) = P₀(1+r)^k − Payment·[((1+r)^k − 1) / r], floored at 0
```

- `P₀` = latest recorded `liability_valuation` balance
- `r` = `interest_rate` / 12
- `Payment` = (`custom_monthly_payment` or derived `M`) + `extra_monthly_payment`
- `k` = months from now

Once `B(k)` hits 0 it stays 0 for all later months (loan paid off) — no negative balances, no simulation.

### Freed payments redirect into contributions

When a Liability pays off, the payment that used to service it stops leaving the user's pocket. That freed money is **added to the monthly contribution** from `ceil(payoff_months)` onward — the loan isn't clear until the final partial payment lands, so the money isn't available until the month after.

```
freed = (custom_monthly_payment or derived M) + extra_monthly_payment − escrow_portion
```

- `escrow_portion` (new optional field, default 0): the part of a statement payment that is property tax, insurance or PMI. It exists because `custom_monthly_payment` above is explicitly permitted to carry escrow baked in — and escrow does **not** stop at payoff. Excluded from the redirect only; the payoff math in `B(k)` still uses the full `Payment`.
- The `extra_monthly_payment` redirects too: it's money the user already chose to divert into the loan rather than spend.

Always on, no toggle — a toggle whose off position is "the freed money vanishes" would make this a two-scenario projection, which the map's settled foundation rules out. It is disclosed instead in the Plan page's assumptions block and in the payoff marker's label.

With N amortizing Liabilities, contributions form an N-step staircase and the segmented chain above has N+1 segments.

### Payoff marker on the Net Worth timeline

The redirect makes payoff a visible upward inflection in projected Net Worth, so the dashboard hero timeline carries **one marker per amortizing Liability** whose payoff falls inside the horizon, labelled with the step size — "Mortgage paid off · +3,155/mo". Not restricted to a mortgage: any Liability with Amortization Assumptions gets one, consistent with the capability-based rule above.

(Without the redirect, payoff would instead be a slight *downward* deflection — the draining balance was adding lift to Net Worth, and payoff removes it — which is why the marker was ambiguous before [Projection formula reconciliation](07-projection-formula-reconciliation.md).)

### Projected Net Position (new CONTEXT.md term)

A Liability with Amortization Assumptions can optionally set `linked_holding_id` to pair it with the Holding it financed (e.g. a mortgage linked to the house it's secured against). When linked, the UI can show a combined **Projected Net Position** trajectory: that Holding's projected value minus its linked Liability's projected balance, at each future year. Deliberately not called "equity" — that collides with the existing "Equity" Asset Class (stocks).

### Schema amendment required

This resolution adds fields to the `liability` table beyond what [Data-model schema](03-data-model-schema.md) fixed. (A second amendment, `escrow_portion`, follows from [Projection formula reconciliation](07-projection-formula-reconciliation.md).) That ticket has been amended in place with the new field list (see its Answer, "Amendment" section) rather than reopened, since nothing about it is newly undecided — the fields fall directly out of this ticket's answer.

### Implementation note (not a modeling decision, flagging for the build session)

If `Payment` doesn't cover a month's interest (`Payment ≤ P₀·r`), the closed-form formula produces a *growing* balance (negative amortization) rather than flooring at 0. Worth a basic input-validation warning at entry time ("this payment won't cover interest"), but doesn't change the formula's shape.

### CONTEXT.md updates made alongside this ticket

- **Liability**: noted it may optionally carry Amortization Assumptions and link to the Holding it financed.
- **Amortization Assumptions** (new term): optional loan details on a Liability enabling auto-payoff projection; explicitly not Mortgage-Class-specific.
- **Projection**: widened to cover a Holding's value and a Projected Net Position, not just Net Worth; clarified "one shared set of assumptions."
- **Projected Net Position** (new term): the paired Holding-value-minus-linked-Liability-balance figure; `_Avoid_: Equity, home equity` — collides with the "Equity" Asset Class.
