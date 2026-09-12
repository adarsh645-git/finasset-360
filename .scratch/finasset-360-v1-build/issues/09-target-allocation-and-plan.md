Type: build
Status: resolved

# 09: Target Allocation and the Plan page

**What to build:** The User sets a goal percentage per Asset Class and sees it against reality. The dashboard gains distribution bars with the target drawn as a tick on the same track, plus the gap in home-currency money — because the money figure is the actionable one, not the percentage. Plan becomes the second breadcrumb root, carrying the Target Allocation editor with a running total so the User can see when their percentages don't sum to 100.

Charts are horizontal bars with a target tick. No pie, donut or treemap anywhere: they cannot show a target, they need a legend, and they ask the reader to compare angles. Bars are drawn in **tree order**, not size order, so the eye maps rows to rows.

Spec: [`docs/SPEC.md`](../../../docs/SPEC.md) — user stories 52–54, 112–113.

**Blocked by:** 04.

- [x] `target_allocation` keyed on `(user_id, asset_class_id)` with `target_percent`, `on delete cascade` from Asset Class (a current-state goal has no historical significance)
- [x] Plan is the second breadcrumb root, sibling to Portfolio
- [x] Target Allocation editor: percent per Asset Class, actual shown beside it, running total
- [x] The running total makes a set that doesn't sum to 100 visible; it is not silently normalised
- [x] Dashboard distribution bars in tree order with a target tick on the same track
- [x] The gap is shown in home-currency money as well as percent
- [x] Two-column dashboard above ~1200px — headline and timeline beside allocation, staleness and Start Check-in — stacking below. "Start Check-in" is ticket 08's button, not yet built as of this ticket, so the stacked section below the grid currently holds only staleness; ticket 08 should slot its button in there.
- [x] Allocation tracks keep a minimum width so the target tick stays visible when labels and figures are wide (this regressed once in prototyping and defeated the chart's purpose)
- [x] Test: User A cannot read or write User B's Target Allocation
