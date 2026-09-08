# Narrow-viewport variants — design brief

Design brief only. No code. Target: a new standalone `variant-e-narrow.html`, copied from `variant-e.html`, with three narrow strategies switchable via `?n=1|2|3` and a floating switcher following `index.html`'s existing pattern (lines 59–89 for the chrome, 2906–2950 for the boot/wire). Answers [Narrow-viewport behavior](../../issues/10-narrow-viewport-behavior.md).

## 0. What was measured first

Before designing, `variant-e.html` was loaded in a 390 × 780 iframe (agent Chrome clamps `resize_window` to ~1288px, so an iframe harness is the only way to get a true narrow viewport here — reuse that trick when verifying). Findings, which narrow the problem far more than the ticket assumed:

**Already works at 390px, do not touch:**
- **The top strip.** `.e-topstrip` is `flex-wrap: wrap`, and it wraps cleanly — wordmark + Portfolio/Plan on line 1, Net Worth readout + Check-in control on line 2. The ticket's question "where do the Net Worth readout and Check-in control go when the strip can't hold them" is already answered by the existing CSS.
- **Check-in mode.** `.e-checkin-card` is `width: 560px; max-width: 100%`, and `eRenderCheckin` replaces the entire content area, bypassing the column shell. At 390px it renders as a clean single card: name, class, focused input with the value pre-selected, sparkline, date. **This is already the best mobile surface in the app and needs no layout work.** Its one real defect is §2.2 below.
- **Dashboard *content*.** `.e-dash-grid` is grid only at ≥1200px, and `.d-alloc-row` has a `@container e-alloc (max-width: 499px)` rule that reflows the bar to its own line. The content reflows correctly; it just never gets the space.
- **The Plan page.** `eRerender` returns before building `.c-columns` when `eState.root === 'plan'`, and `.e-plan-grid` is grid only at ≥1200px. Structurally safe. **Spot-check it at 390px during the build** — this is the one surface not visually confirmed.

**Broken at 390px:**
- **The column shell, and only the column shell.** `.c-col` is `flex: 0 0 270px` and `.c-col-detail` is `min-width: 560px`, so the shell's floor is **830px**. Inside `.c-columns { overflow-x: auto }` at 390px you get all of column 1 and a ~120px slice of the detail pane — the Net Worth headline is clipped mid-number ("468,2"). Everything the ticket is really about reduces to this one fact.

So the design question is **not** "how does the app go responsive." It is: **what replaces the two-pane column shell below its 830px floor?** Everything else is already fine or is a shared fix (§2).

## 1. Breakpoint

**900px.** Below it, narrow mode; at and above it, current behaviour unchanged. The number is the 830px shell floor (270 + 560) plus a small margin, so a tablet at 834px portrait doesn't land in a zone where the shell technically fits but has zero room for a second list column.

Only one breakpoint. Do not add a tablet tier — 900–1199px already degrades gracefully today (columns + detail, single-column dashboard), and inventing a third layout to review triples the surface for no decision.

## 2. Shared across all three variants

These are settled, not part of what's being compared. Implement them identically in all three so the only difference the reviewer sees is the browsing model.

**2.1 Touch has no hover.** Inline click-to-edit currently signals editability on hover, which does not exist on touch. In narrow mode the editable figure (`.d-headline-figure` in the detail pane, and the check-in card's value) carries a **persistent** affordance: a 1px dotted underline in `--text-muted` plus a small pencil glyph trailing the number. Always visible, never hover-gated.

**2.2 Check-in's keyboard hints are dead on touch.** The card shows `↵ keep unchanged · L use live estimate · Esc exit`. In narrow mode replace that line with three real tap targets below the input: **Keep** / **Use estimate** (only when the Holding has a Live Estimate) / **Done**. Keep the keyboard bindings working — this adds touch targets, it doesn't remove keys.

**2.3 Tap targets.** `.c-row` is 34px tall. In narrow mode raise list rows to **44px** minimum.

**2.4 Net Worth stays readable.** The requirement is "read Net Worth" on a phone. Make the top strip `position: sticky; top: 0` with the page background in narrow mode, so the readout survives scrolling. It already wraps correctly; this only pins it.

**2.5 Nothing scrolls horizontally.** In narrow mode `.c-columns` loses `overflow-x: auto` and `.c-col-detail` loses `min-width: 560px`. A horizontal scrollbar in narrow mode is a bug in every variant.

## 3. The three variants

Radically different browsing models, not three shades of the same list. Each must be judged on the phone requirement — read Net Worth, record one Valuation — while not making the desktop shape incoherent.

### N1 — One pane at a time (canonical Miller)

The textbook answer, and the one to beat. `eState.path` already encodes depth as an array, so narrow mode renders **only the deepest meaningful pane**, full width:

- `path = []` → the dashboard
- `path = [class]` → that class's Holdings list
- `path = [class, holding]` → the Holding detail
- `path = [liabilities]` → Liability Classes; `[liabilities, liabClass]` → Liabilities; then the Liability detail

Column 1 is reachable by tapping `Portfolio` in the breadcrumb. The breadcrumb is the **only** back affordance and must therefore be sticky directly under the top strip, with the parent segment given a visible `‹` chevron so it reads as "back" rather than as decoration.

The navigation model is untouched — this is Variant E windowed to one pane. Cheapest to build, and the least surprising for anyone who has used Finder or iOS Files. Its weakness is that depth is invisible: a stale Holding three levels down gives no signal from the root, which is exactly the gap the desktop design compensated for with the staleness list and column-1 markers.

### N2 — Accordion outline (replace the navigation model)

Below 900px the column browser is replaced by **one scrolling indented outline**. Asset Classes and Liabilities are expandable rows; tapping expands **in place** to reveal Holdings indented beneath, without leaving the screen. Multiple branches may be open at once. Tapping a leaf opens its detail as a **bottom sheet** over the outline, dismissible by swipe-down or a close control.

The dashboard sits above the outline in the same scroll, not as a separate destination.

This is essentially Variant D's tree — which lost on desktop — being retried where its strength matters: it shows hierarchy *and* depth simultaneously, so three stale Holdings across two classes are visible without navigating anywhere. Miller columns structurally cannot do that. Its weakness is that the outline gets long, and the bottom sheet is a second overlay concept the app doesn't otherwise have.

### N3 — Task-first (abandon the hierarchy)

Takes the established requirement literally: on a phone, only "read Net Worth" and "record one Valuation" need to work. So the phone view is **not a hierarchy browser at all**. One scrolling screen:

1. Net Worth headline, large.
2. The recorded + projected timeline.
3. **Start Check-in** as the primary action, prominent — not a link in the top strip.
4. A **flat list of every Holding and Liability, sorted stale-first**, no hierarchy. Class appears as a subdued caption on each row, not as a level to navigate. Tapping a row opens its detail (full screen, breadcrumb-free, with a plain Close).
5. Target Allocation bars and the staleness list below the fold.

Hierarchy browsing still exists but is demoted to a secondary **Browse by class** entry that opens N1-style drilling.

This is the variant that tests the ticket's own hypothesis — that making Check-in work is worth more than making the columns work. Its weakness is a flat list of 30 items with no grouping, and that it makes the phone a visibly different product from the desktop.

## 4. The switcher

Follow `index.html` exactly: fixed bottom-centre pill, deliberately foreign chrome (dark pill, high contrast, clearly not part of the design under review), `←` / label / `→`, wrapping. Label reads e.g. `N1 · One pane at a time`. Arrow keys cycle, but **do not** intercept them when an `<input>`, `<textarea>` or `[contenteditable]` is focused — the check-in card autofocuses an input, so this will bite otherwise. Update the param with `history.replaceState` and re-render.

`?n=` defaults to `1`. The param must survive reload so a reviewer can link a specific variant.

**Do not** gate the switcher on viewport width — a reviewer on a desktop must be able to flip variants while resizing to see each one cross its breakpoint.

## 5. Constraints

- **Throwaway.** Top-of-file comment marking it a prototype, per `index.html` line 1.
- **One file.** `variant-e-narrow.html`, self-contained, no build step, opened directly or over `python3 -m http.server`.
- Share `DATA` / `DERIVED` / the math and format helpers / `onActivate` with the copied E code. Do **not** refactor `variant-e.html` itself — it is the settled desktop artifact and this prototype must not disturb it.
- Wide behaviour (≥900px) must be **byte-for-byte the current E experience** in all three variants. If a reviewer at 1400px can tell which `?n=` they're on, that's a bug.
- No persistence, no tests, no error handling beyond runnability.

## 6. What the reviewer is being asked

Only this: **which browsing model earns the phone?** Everything in §2 is already decided, and the desktop shape is not up for reconsideration. The expected outcome is a pick, or the usual and more useful "N1's navigation with N3's stale-first list."
