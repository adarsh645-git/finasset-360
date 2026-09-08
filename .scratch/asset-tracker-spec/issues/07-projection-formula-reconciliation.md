Type: grilling
Status: resolved
Assignee: Adarsh Reddy

## Question

Reconcile two parts of the [Projection method](04-projection-method.md) answer that don't compose unambiguously:

- The **core formula** projects `FV = P(1+r)^n + C·[…]` with `P = current Net Worth`. Net Worth already nets out Liabilities, so this line implicitly grows Liabilities at the same rate as Holdings and never reflects a payoff.
- The **Liabilities section** says a Liability is held flat, or amortized via `B(k)` when it has Amortization Assumptions.

Two readings give very different year-20 figures on the prototype's sample data:

| Reading | Year-20 Net Worth |
|---|---|
| `P = Net Worth`, Liabilities implicit | ≈ 2.24M |
| `P = Holdings total`, minus projected Liabilities (mortgage amortized to 0 by 2044, others flat) | ≈ 3.65M |

Surfaced by [the tree-UI prototype](02-tree-ui-prototype.md): its dashboard timeline marks "Mortgage paid off · 2044" on the projected Net Worth line, but the line doesn't bend there because the prototype used the first reading. Decide which reading is the spec (the second is the one whose payoff marker means something), and amend the Projection-method ticket's Answer in place.

## Answer

**Reading 2 is the spec**: `P = Holdings total`, each Liability projected forward on its own rule, netted at each year. [Projection method](04-projection-method.md) has been amended in place.

### Why Reading 1 was wrong

Because Net Worth = Holdings − Liabilities, the two readings differ by exactly one term:

```
Reading 2 = Reading 1 + [ L₀(1+r)ⁿ − L(k) ]
```

On the prototype's sample data that term is 1,425,209 − 20,550 = **1,404,690**, precisely the 3.65M − 2.24M gap. Reading 1 grows every debt at the Portfolio's equity growth rate: the mortgage reaches 1,357,184 by 2046 (two years *after* its scheduled payoff), the Amex triples to 7,117. Nobody entered those assumptions; they're a side effect of compounding a netted figure.

The decisive consequence: under Reading 1 **Amortization Assumptions are decorative**. A user fills in rate, term and `extra_monthly_payment: 200` and the Net Worth line moves by exactly zero — the fields only affect the Liability's own sparkline. Reading 2 also composes with Projected Net Position, which already projects assets and liabilities separately.

### Freed loan payments redirect into contributions at payoff

Reading 2 exposed a cash-flow question Reading 1 hid: the model has the user paying $3,155/mo of debt service *and* contributing $1,500/mo, and at payoff the $3,155 simply vanished.

**Decision: the freed payment is added to the monthly contribution at payoff** (option (c) of three considered). Rejected: leaving it to vanish (3,647,690 at y20 — makes payoff invisible on the Net Worth line, a 2.5° downward deflection); netting debt service out of contributions (2,954,629 — silently redefines the contribution field into a withdrawal). Chosen: 3,720,879 at y20.

This is **always on, with no toggle**. A toggle whose off position is option (a) would be a two-scenario projection, which the map's settled foundation rules out. Disclosure lives in the payoff marker's label and the Plan page's assumptions block instead.

**What redirects**: the full `Payment` (derived `M` or `custom_monthly_payment`, plus `extra_monthly_payment`), *minus* a new optional `escrow_portion`. The escrow field exists because ticket 04 permits `custom_monthly_payment` to carry escrow/PMI baked into a statement payment — and property tax does not stop at payoff. On a $3,800 statement payment with $650 of tax and insurance, redirecting the full amount overstates year-20 Net Worth by **64,816**. Default 0; excluded from the redirect only, not from the payoff math.

**Formula shape**: `C` is now piecewise-constant, stepping at each payoff, so the core projection becomes a chain of closed-form segments rather than one evaluation. Still deterministic, still no simulation. The redirect begins at `ceil(payoff_months)` — the loan isn't clear until the final partial payment lands.

### Payoff marker moves to a real inflection

Under (c) the post-payoff slope rises (+129,812 per 6 months vs +122,252 before, on sample data) instead of falling, so the marker stays on the dashboard hero timeline — but it must be **generalised off the hardcoded mortgage** (`DERIVED.mortgage`, found by `id === 'mortgage'`) to one marker per amortizing Liability, since ticket 04 made Amortization Assumptions capability-based. The label carries the step size: "Mortgage paid off · +3,155/mo". With a hypothetical amortizing auto loan alongside, contributions step 1,500 → 1,931 (2030) → 5,087 (2044).

Prototype fix required regardless: the marker's y-position is computed from `fv(DERIVED.netWorth, …)`, the Reading-1 curve, so it will float ~1.1M off the Reading-2 line.

### Carried unchanged

- **Non-amortizing Liabilities stay flat** (ticket 04's default). Reading 2 makes this visible where Reading 1 hid it — the Amex sits at 2,150 in 2046. Kept because flat is *inert*: the projection invents no payoff schedule the user never entered, and the visible oddity points straight at the fix (fill in Amortization Assumptions on that Liability). Reading 1's alternative was growing a credit-card balance at 6%.
- **`Projected Net Position` stays narrow** — the linked-pair figure only. Under Reading 2 the portfolio-level projection is the same arithmetic at a wider scope, but that figure already has a name (Net Worth); generalising would give one number two names, exactly what the glossary's `_Avoid_` lines guard against. The `Projection` entry was sharpened instead — its old wording ("a forward-looking trajectory of future Net Worth") read perfectly consistently with Reading 1, which is what allowed this ticket to exist.

### Downstream edits made

- [Projection method](04-projection-method.md) — Answer amended in place (core formula, segmented chain, redirect rules, marker).
- [Data-model schema](03-data-model-schema.md) — second `liability` amendment: `escrow_portion`.
- `CONTEXT.md` — `Projection` and `Amortization Assumptions` sharpened.

No ADR: the decision fails the hard-to-reverse leg of the three-part test (it's a computation change plus one nullable column, not a data migration).
