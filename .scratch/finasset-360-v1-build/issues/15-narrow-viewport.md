Type: build
Status: ready-for-agent

# 15: Narrow viewport

**What to build:** Below 900px the Miller columns are replaced by an accordion outline: Asset Classes and Liabilities expand in place, several branches may be open at once, and tapping a leaf opens its detail as a bottom sheet.

This is structurally the sidebar-tree shape that **lost** on desktop, winning on narrow for the same reason it lost on wide — it shows hierarchy *and* depth simultaneously, so stale items across several classes are visible without navigating. Miller columns structurally cannot do that, which is exactly why the desktop design needs the staleness list to compensate.

**Two navigation models across widths is a deliberate call.** The cost — someone switching devices relearns the navigation — was weighed and accepted rather than reopening the settled desktop shape.

Scope came from measurement, not guesswork: at a true 390×780 viewport the top strip already wrapped, Check-in already bypassed the column shell entirely, the dashboard content already reflowed, and the Plan page already returned before building the shell. **The entire problem is the shell's 830px floor** (270px columns plus a 560px detail minimum). The breakpoint is 900px so an 834px portrait tablet doesn't land where the shell technically fits but has no room for a second list column. One breakpoint only; 900–1199px already degrades acceptably.

The requirement it serves: desktop-first, with only "read Net Worth" and "record one Valuation" needing to work on a phone.

Spec: [`docs/SPEC.md`](../../../docs/SPEC.md) — user stories 47, 102–107.

**Blocked by:** 08, 09.

- [ ] Single 900px breakpoint; `.c-col` sizing and the detail column's floor both released below it
- [ ] Accordion outline replaces Miller columns: expand in place, multiple branches open at once
- [ ] Section order: Net Worth (figure, subline, timeline) → Portfolio outline → Target Allocation, staleness list, Start Check-in
- [ ] Leaf detail opens as a bottom sheet
- [ ] **No horizontal scrolling anywhere**
- [ ] Inline click-to-edit carries a persistent 1px dotted underline plus a trailing pencil glyph — never hover-gated, since there is no hover on touch
- [ ] Check-in's keyboard hints replaced by Keep / Use estimate / Done tap targets, **with the key bindings retained and both routed through one shared action so they cannot drift**
- [ ] 44px minimum row height
- [ ] Top strip sticky, so the Net Worth readout survives scrolling
- [ ] Decide and implement: whether the outline's expanded/collapsed state persists between visits (the prototype resets it) — left open deliberately
- [ ] Decide and implement the bottom sheet's dismissal gesture properly. It is a second overlay concept the app doesn't otherwise use; the prototype gave it a close button plus a minimal drag-to-dismiss on the handle
- [ ] **Any UI verification claim must name the width it was made at.** Agent browser tooling clamps to ~1288px while the User reviews at ~2000px — that gap is exactly how a dashboard shipped stranding 900px of empty window that read as "a minor aesthetic note" at the narrower width
