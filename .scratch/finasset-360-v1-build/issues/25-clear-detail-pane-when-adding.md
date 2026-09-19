Type: build

# 25: Starting to add a Holding should clear the detail pane

**What to build:** When the User opens the add-Holding form, the right-hand detail pane should stop showing the previously selected Holding, so it is unambiguous that nothing existing is being edited.

Not spec-derived — filed ad hoc from a user bug report: "When I start creating a new holding the right pane needs to be refreshed, I still see the old holding."

**Relationship to ticket 20:** [20](issues/20-select-new-holding-after-add.md) fixed the *end* of the flow (after a successful add, select the new Holding). This is the *start* of it: between clicking to open the form and submitting, the pane still shows the old selection. Different moment, same surface; do not reopen 20.

**Likely cause (from a read of the code, not yet reproduced):** opening the form is purely local state inside `AddHoldingRow`; it never tells `PortfolioShell`, whose `selectedHoldingId` is untouched, so `leafDetail` keeps rendering the old `HoldingDetailPanel`. It needs an `onStartAdd`-style callback (or lifting `isOpen`) that sets `selectedHoldingId` to `null`.

**Decision to confirm at build time:** what the pane shows while adding. Default: deselect the Holding, so the pane falls back to the Asset Class's detail panel (`AssetClassDetailPanel`), with the Holding row de-highlighted in the column. Alternatives the user may prefer: an explicit "New Holding" placeholder pane, or a live preview of the draft. Ask before building anything richer than the default.

**Blocked by:** none. *(Pairs with 24, same rows; and if Cancel is pressed the deselection should not be undone unless the user wants the prior Holding restored, which is part of the same decision.)*

- [ ] Opening the add-Holding form deselects the current Holding and the detail pane no longer shows it
- [ ] Cancel: behavior settled (stay deselected vs. restore the previous selection) and consistent
- [ ] A successful add still selects the new Holding (ticket 20 unchanged)
- [ ] Same treatment for the add-Liability form, or an explicit note that it's out of this ticket
- [ ] UI verified by hand, naming the viewport width per the map's Notes
