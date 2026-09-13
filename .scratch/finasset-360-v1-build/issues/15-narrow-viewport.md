Type: build
Status: resolved

# 15: Narrow viewport

**What to build:** Below 900px the Miller columns are replaced by an accordion outline: Asset Classes and Liabilities expand in place, several branches may be open at once, and tapping a leaf opens its detail as a bottom sheet.

This is structurally the sidebar-tree shape that **lost** on desktop, winning on narrow for the same reason it lost on wide — it shows hierarchy *and* depth simultaneously, so stale items across several classes are visible without navigating. Miller columns structurally cannot do that, which is exactly why the desktop design needs the staleness list to compensate.

**Two navigation models across widths is a deliberate call.** The cost — someone switching devices relearns the navigation — was weighed and accepted rather than reopening the settled desktop shape.

Scope came from measurement, not guesswork: at a true 390×780 viewport the top strip already wrapped, Check-in already bypassed the column shell entirely, the dashboard content already reflowed, and the Plan page already returned before building the shell. **The entire problem is the shell's 830px floor** (270px columns plus a 560px detail minimum). The breakpoint is 900px so an 834px portrait tablet doesn't land where the shell technically fits but has no room for a second list column. One breakpoint only; 900–1199px already degrades acceptably.

The requirement it serves: desktop-first, with only "read Net Worth" and "record one Valuation" needing to work on a phone.

Spec: [`docs/SPEC.md`](../../../docs/SPEC.md) — user stories 47, 102–107.

**Blocked by:** 08, 09.

- [x] Single 900px breakpoint; below it the desktop Miller shell is hidden entirely (`hidden min-[900px]:flex`) rather than shrunk, so there's no `.c-col`/detail floor to release — a different component tree (NarrowShell) renders instead
- [x] Accordion outline replaces Miller columns: expand in place (`AccordionBranch`), multiple branches open at once (`Set<string>` of expanded keys, not exclusive single-open state)
- [x] Section order: Net Worth (figure, subline, timeline) → Portfolio outline → Target Allocation, staleness list, Start Check-in (NarrowShell.tsx)
- [x] Leaf detail opens as a bottom sheet — reuses the exact same detail-panel content (and selection state) the desktop Miller column's rightmost panel shows, via a shared `leafDetail`
- [x] **No horizontal scrolling anywhere** — `overflow-x-hidden` at the shell root, `truncate`/`min-w-0` throughout, DistributionBar's fixed-width columns narrowed/dropped below 900px, a defensive `overflow-x-auto` around the one remaining fixed-width element (the 320px-wide timeline chart)
- [x] Inline click-to-edit (ValuationEditor) carries a persistent 1px dotted underline plus a trailing pencil glyph below 900px — never hover-gated; desktop's existing hover-only look is untouched
- [x] Check-in's keyboard hints replaced by Keep / Use estimate / Done tap targets below 900px; Enter/L/Esc stay live at every width; both paths call the same `keep`/`recordDraft`/`acceptLiveEstimate` functions in CheckInStep
- [x] 44px minimum row height on every row/tap-target this ticket touched (accordion rows, staleness rows, Check-in's buttons, the bottom sheet's close button, the launcher)
- [x] Top strip sticky (`sticky top-0`) — a no-op above 900px, where nothing scrolls past it; the narrow accordion is the one layout where the whole page scrolls
- [x] Decided: expand/collapse persists via `localStorage` (a per-device UI preference, hydrated after mount to avoid an SSR hydration mismatch) — no schema change
- [x] Decided: the bottom sheet dismisses via an explicit close button, drag-down-past-threshold on the handle (tracked against the gesture's own start point, not `movementY` — more reliable for touch), and backdrop-click as a bonus
- [x] **Width disclosure**: no browser-driven visual verification was performed for this ticket — Google-OAuth sign-in isn't something this agent can complete, and docs/SPEC.md's own Testing Decisions already make UI correctness a by-hand/User responsibility. Verification here was static: every Tailwind breakpoint and fixed-width element's fit was computed by hand against realistic phone widths (360–390px), plus typecheck/lint/full test suite/production build, all clean. The User should confirm visually and name the width they checked at, per this bullet's own rule.
