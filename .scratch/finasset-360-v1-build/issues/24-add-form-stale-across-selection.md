Type: build

# 24: Switching selection leaves the add-Holding form's draft behind

**What to build:** Switching the selection in the leftmost column (Asset Class) or the middle column (Holding) should leave the columns to its right showing a clean, fresh state for the new selection. Today a half-typed add-Holding form survives the switch.

Not spec-derived — filed ad hoc from a user bug report: "When I switch between the tree on the penultimate column the right column needs to be refreshed [screenshot: Cash selected, 0 Holdings, add form still showing `NVIDIA CORP`] it is not, it happens to the left most column and the middle column."

**Likely cause (from a read of the code, not yet reproduced):** the screenshot shows the Holdings column's add form still open with `NVIDIA CORP` typed while Cash is the selected class. `AddHoldingRow` (`src/components/portfolio/AddHoldingRow.tsx`) holds its whole draft in local `useState` (`isOpen`, `name`, `symbol`, `quantity`, `sector`, `heldAt`, `currency`) and is rendered at `PortfolioShell.tsx` as the `MillerColumn` footer with **no `key`**, so it stays mounted across an Asset Class switch — draft and open state survive, only the `isCash` prop changes. `AddLiabilityRow` and the Liabilities column have the same shape and likely the same gap.

**What is *not* the cause:** the detail panels. `HoldingDetailPanel` and `LiabilityDetailPanel` are keyed by id at their call site in `PortfolioShell.tsx`, so they do remount on selection change (the `key=` on the inner `<form>` is redundant but harmless). If the user also sees stale content *inside the detail pane* after a switch, that is a different bug and needs a repro.

**Decision to confirm at build time:** default is *close the add form and discard its draft on any selection change* (key the footer on the selected class id, and on the selected Holding if switching Holdings should also reset it). Alternative: keep the draft but re-scope it — rejected as default because the draft is tied to the Asset Class it was started under, and the Cash form hides fields other classes need.

**Blocked by:** none. *(Touches the same rows as 25; take together or in order 24 → 25.)*

- [x] Switching Asset Class closes the add-Holding form and clears its draft
- [x] Switching Holding in the middle column also leaves no stale add-form state (or an explicit note that it should persist, and why)
- [x] Same for the add-Liability form when switching Liability Class / Liability
- [x] No effect on the add form when nothing is switched (typing, error state, in-flight save unchanged)
- [ ] UI verified by hand, naming the viewport width per the map's Notes

## Resolution

Built, **not yet resolved** — the last box (hand verification at the user's viewport) is the user's to tick. In `PortfolioShell.tsx` the two `MillerColumn` footers are now keyed on the selection: `AddHoldingRow` on `selectedClass.id` + `selectedHoldingId`, `AddLiabilityRow` on `selectedLiabilityClass.id` + `selectedLiabilityId`. Any selection change remounts the row, closing it and discarding its draft (the ticket's default decision).

- **Consequence to know about:** clicking a Holding (or Liability) row in the same column while a draft is open now discards that draft. A successful add selects the new Holding, which also remounts the row, but the form has already reset by then. `router.refresh()` and a failed save don't change the selection, so typing, error state and in-flight saves are untouched.
- No automated test: the suite runs in `node` with no jsdom/testing-library, so remounting isn't observable. Typecheck and lint clean.
- Full suite: 8 failures, all in `.claude/worktrees/ticket-09-target-allocation/tests/unit/empty-portfolio-render.test.tsx` (a stale worktree copy); identical with this change stashed.
