Type: build
Status: resolved

# 20: Select the new Holding after adding it

**What to build:** Adding a Holding should leave the right-hand detail pane showing the Holding just added. Today the pane keeps showing whichever Holding was selected before the add.

Not spec-derived — filed ad hoc from a user bug report ("when adding a new holding the right pane (which shows details about the holding) is set to the previous holding selected").

**Likely cause (from a read of the code, not yet reproduced):** `addHolding` in `src/components/portfolio/PortfolioShell.tsx` POSTs to `/api/holdings` and calls `router.refresh()`, but never touches `selectedHoldingId`, so the pane stays on the old selection. Check whether the POST response returns the new row's id (needed to select it) and whether the narrow-viewport accordion/bottom-sheet (ticket 15) has the same gap.

**Decision to confirm at build time:** default is *select the new Holding*, and on narrow viewports open its bottom sheet the way tapping a row would. If instead the user wants the pane cleared/empty after an add, say so.

**Blocked by:** none.

- [x] After a successful add, the new Holding is the selected Holding and the detail pane shows it (wide layout)
- [ ] Same behavior at narrow viewport (accordion + bottom sheet), or an explicit note that it's handled differently and why
- [x] The add form still resets/closes as it does today
- [x] Failed add leaves the previous selection untouched
- [ ] Test at the HTTP route seam if the POST response shape has to change (return the new Holding's id); UI selection itself verified by hand, naming the viewport width per the map's Notes

## Resolution

Built on branch `ticket-20-select-new-holding`, merged to main. Cause confirmed: `addHolding` never touched `selectedHoldingId`. `POST /api/holdings` already returned the new row's id, so the route is unchanged (one test assertion added to lock the `id` in the response). New `submitJsonForResult<T>` in `src/lib/http/client.ts`; `submitJson` now wraps it. A successful add selects the new Holding before `router.refresh()`; a failed add leaves the selection alone. Default kept: select the new Holding.

- Narrow viewport: `NarrowShell` has no add-Holding affordance, so adds only happen in the ≥900px Miller layout; the bottom sheet reads the same `selectedHoldingId`. Left unticked as no narrow add path exists.
- Known edge, not fixed: switching Asset Class while the POST is in flight selects a Holding in the old class; harmless (pane stays empty until you return to that class).
- **Still to do by hand:** add a Holding in the wide layout at ~2000px and confirm the pane shows it. Not verified in a browser.
