Type: build
Status: resolved

# 13: Target Net Worth and the gap

**What to build:** The User names an amount and a date together — "6M by 2046" — read as today's purchasing power, so the figure means what they meant by it. It is drawn across the projection chart, and the gap is reported as a **date first**: "2051 — five years late", with the money figure beneath.

The date leads because it is the sentence someone acts on, and because it degrades gracefully when a target is far out of reach, which a bare shortfall figure does not. On the sample portfolio the same target is 2,166,250 *over* on the nominal line and 1,478,545 *short* on the real line — read against the real line, per ticket 12.

Exactly one Target per User. Several would force the solver to pick which to solve for or find the binding constraint, and a near-term earmarked goal measured against *total* Net Worth is close to meaningless — the User would be told they can afford a house deposit because their 401k is large.

Spec: [`docs/SPEC.md`](../../../docs/SPEC.md) — user stories 85–90.

**Blocked by:** 12.

- [x] `target_amount` and `target_date` on `projection`, nullable together — a Projection without a Target is valid. Columns, not a child table, because there is exactly one
- [x] The amount and date are entered and displayed as one term, never a bare figure
- [x] The target is read as today's purchasing power and compared against the **real** line
- [x] Target drawn as a line across the projection chart
- [x] Gap reads as a date first, with the money figure beneath
- [x] A passed target date prompts on next visit with what was actually reached — "your 2046 target has passed; you reached 5.2M against 6M. Set a new one?" A stale target quietly poisons every later projection view, and silent auto-archiving throws away the one moment the app can say something true about whether the plan worked. Shown on both the Dashboard and the Plan page, since either can be the "next visit"
- [x] Test: the crossing date is computed against the real line, not the nominal one
- [x] Test: a Projection with no Target set renders without error — no component-render tests exist anywhere in this repo yet, so this is covered at the route/engine level (a null Target round-trips through the API, and the UI guards every Target-only render behind a null check)
