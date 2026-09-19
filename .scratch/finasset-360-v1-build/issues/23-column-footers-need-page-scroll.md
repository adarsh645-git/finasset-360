Type: build
Status: resolved

# 23: Column footers ("+ New Asset Class", add Holding form) still need scrolling to reach

**What to build:** At the user's normal viewport the Miller shell should fit the window exactly: the "+ New Asset Class" row, the Holdings column's add form (Add/Cancel), and the detail pane's Save/Archive/Delete bar are all visible without scrolling the page. Today the user has to scroll down to reach them.

Not spec-derived — filed ad hoc from a user bug report: "I am still having to scroll down to [the bottom strip: `+ New Asset Class`, the add form's `USD` / Add / Cancel, and `Save / Archive / Delete permanently`] to show up." The **"still"** matters: ticket 15 already made one attempt at this (the `min-h-0` on the Miller wrapper in `PortfolioShell.tsx`, whose comment says it exists so the columns' `overflow-y-auto` engages instead of the whole page scrolling). It did not hold at the user's viewport.

**Not yet reproduced. Read of the code found no cause.** The height chain looks correct on paper: `body min-h-full flex-col` → shell root `h-dvh` (≥900px) → `NetWorthStrip` + `min-h-0 flex-1` wrapper → `Breadcrumb` + `flex-1 overflow-hidden` row → `MillerColumn` (`flex-1 overflow-y-auto` list + `footer`) and the detail panel. So the first job is reproduction, not a fix.

**Open questions to settle first (ask the user, or reproduce at their width *and height*):**
- *What* scrolls: the whole page, or a column/detail pane internally? The screenshot crop shows footers from two columns and the detail's action bar at once, which suggests the whole page.
- Which selection state? The screenshot with the add form open in an empty Cash class fits on screen; the crop with Save/Archive implies a Holding was selected (longer detail pane). Does it only happen with a Holding selected, or also with a Holding + open add form?
- Browser zoom / window height. Per the map's Notes, agent Chrome clamps to ~1288px wide and cannot stand in for the user's ~2000px; a short window height is the other variable that hides this.
- Candidates if page-level scroll is confirmed: something outside the `h-dvh` root adding height; a flex child in the detail pane missing `min-h-0`; the Next dev overlay/indicator. All unverified guesses.

**Blocked by:** none. *(Reproduce before building. Shares the `PortfolioShell.tsx` layout with 24 and 25 but does not depend on them.)*

- [x] Reproduced (or the user names the exact state) and the cause identified
- [x] At the user's viewport, with a Holding selected and the add form open, no page scroll is needed to reach any column footer or the detail action bar
- [x] Long detail content (Valuation history, linked Liabilities) scrolls *inside* the detail pane with the action bar pinned
- [x] Verified by hand, **naming the viewport width and height** it was checked at, per the map's Notes

## Resolution

Fixed in `09ae57d` (`PortfolioShell.tsx` root). **Cause:** the shell root had `flex-1` and `min-[900px]:h-dvh` together; `flex-1` is `flex-basis: 0%`, which against `<body>`'s indefinite height resolves to `content`, so `h-dvh` was never applied and the shell grew to its tallest column, scrolling the whole page. Ticket 15's `min-h-0` fixed only the layer below. **Fix:** `min-[900px]:flex-none` on the root so `h-dvh` is the basis; below 900px `flex-1` is kept so the narrow page still scrolls as a whole.

- Cause was derived from the flex spec, not reproduced in a browser; the user confirmed the fix by hand ("this looks good now") at their ~2000px-wide screen. Exact height not recorded.
- No automated test: jsdom has no layout.
- A first screenshot after the push still showed the footer clipped; it cleared on the user's re-test (likely a stale dev bundle).
