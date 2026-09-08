Type: build
Status: ready-for-agent

# 11: Amortization Assumptions and payoff

**What to build:** A User optionally records a Liability's interest rate, original amount and term, and the projection stops holding it flat and amortizes it to payoff. They can override the derived payment with the payment they actually make, add a recurring extra payment to see what paying more does, and record the escrow portion so the app doesn't assume their property tax stops when the loan does. When a loan pays off, the freed money joins the monthly contribution. They can link a Liability to the Holding it financed and read the pair together.

This is **capability-based, not Mortgage-Class-specific** — any Liability opts in by filling the fields, so an auto loan gets the same treatment.

Amortization runs forward from the **current recorded balance**, not the original loan amount: manual Valuation snapshots stay authoritative for "now", consistently with every other Valuation in the app.

```
B(k) = P₀(1+r)^k − Payment·[((1+r)^k − 1) / r]      floored at 0, and 0 thereafter
```

`Payment` is `custom_monthly_payment` when set, else derived `M = L·[r(1+r)^t] / [(1+r)^t − 1]`, plus `extra_monthly_payment` either way.

```
freed = (custom_monthly_payment or derived M) + extra_monthly_payment − escrow_portion
```

The escrow subtraction exists because `custom_monthly_payment` is explicitly permitted to carry escrow and PMI baked into a statement payment, and property tax does **not** stop at payoff. On a $3,800 statement payment with $650 of tax and insurance, redirecting the full amount overstates year-20 Net Worth by 64,816. It is excluded from the redirect only — never from the payoff math.

The redirect is **always on with no toggle**. A toggle whose off position is "the freed money vanishes" would make this a two-scenario projection, which is ruled out. It is disclosed instead — in the Plan page's assumptions block and in each payoff marker's label. That disclosure is part of the spec, not polish.

Spec: [`docs/SPEC.md`](../../../docs/SPEC.md) — user stories 57–66, 74–76.

**Blocked by:** 10.

- [ ] Optional `interest_rate`, `original_loan_amount`, `term_months`, `custom_monthly_payment`, `extra_monthly_payment` (default 0), `escrow_portion` (default 0), `start_date` (display-only, read by no formula), `linked_holding_id` on `liability`
- [ ] Any Liability can carry them, not only one in a "Mortgage" class
- [ ] `B(k)` floors at zero and **stays** zero thereafter
- [ ] Derived payment used by default; `custom_monthly_payment` overrides it when set; `extra_monthly_payment` adds on top either way
- [ ] Entry-time warning when `Payment ≤ P₀·r` — the closed form produces a *growing* balance rather than flooring at zero, so this must be caught at entry (it does not change the formula's shape)
- [ ] Freed payment joins the monthly contribution at `ceil(payoff_months)` — the loan isn't clear until the final partial payment lands
- [ ] `escrow_portion` excluded from the redirect, retained in the payoff math
- [ ] `extra_monthly_payment` **does** redirect — money the User already chose to divert from spending
- [ ] One payoff marker per amortizing Liability inside the horizon, labelled with the step size ("Mortgage paid off · +3,155/mo") — generalised across Liabilities, never keyed to a hardcoded mortgage
- [ ] The redirect is disclosed in the Plan assumptions block and the marker labels; there is no toggle
- [ ] Payoff curve in the Liability's detail panel
- [ ] `linked_holding_id` pairs a Liability with the Holding it financed; Projected Net Position shown from **both** sides of the link (never called "equity" — that collides with the Equity Asset Class)
- [ ] Test: **setting `extra_monthly_payment` moves the projected Net Worth line.** Assert the sensitivity, not just that the figure looks right — a value-only test would have passed under the rejected netting reading
- [ ] Test: `escrow_portion` changes the redirect but not the payoff date
- [ ] Test: the redirect begins at `ceil(payoff_months)`, not before
- [ ] Test: a payoff landing mid-escalation-year splits that year into two segments, and the segmented chain still matches the month-by-month simulation
