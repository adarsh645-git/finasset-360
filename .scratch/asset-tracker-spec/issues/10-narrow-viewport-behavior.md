Type: prototype
Status: resolved
Assignee: Adarsh Reddy

## Question

What does the Miller-column shape become on a narrow viewport?

Graduated from the map's fog line on mobile responsiveness on 2026-09-07, once [the UI shape ticket](02-tree-ui-prototype.md) settled on Variant E. The fog was too coarse to ticket while the shape was unknown; now it is sharp, and it is the one part of E that was never designed.

**Why this isn't trivial**: Miller columns are the shape most hostile to a narrow screen. E uses ~270px columns plus a 560px detail panel, so the full Portfolio → Class → Holding → detail path wants ~1370px. The prototype has a two-column dashboard above ~1200px falling back to a single-column stack below, and the columns themselves horizontally scroll — but nothing below roughly 900px was designed or verified, and a phone was never opened.

The established requirement (from the grilling that produced [the rejected Balance Sheet ticket](08-app-ux-shape-prototype.md), and still current): desktop-first, with only **"read Net Worth"** and **"record one Valuation"** needing to work on a phone.

To settle:

- What replaces the columns on a phone. The usual answer for Miller columns is one column at a time with the breadcrumb as the back affordance — confirm or pick otherwise.
- Whether the dashboard, the detail panel, and the Plan page each get a narrow layout, or whether some are simply desktop-only for v1.
- Whether **Check-in mode** works on a phone. It is arguably the single most phone-appropriate flow in the app (one card, one number, advance), so making it work may be more valuable than making the columns work.
- Where the top strip's Net Worth readout and Check-in control go when the strip can't hold them.
- Whether inline click-to-edit survives on touch, where there is no hover to signal editability.

Prototype the narrow layout rather than deciding it on paper — extend `prototypes/tree-ui/variant-e.html` or branch a copy. Follow the effort's prototype convention (design brief first, then code).

## Answer

**Variant N2 — the accordion outline — wins**, with the section order settled on reaction as: **Net Worth (figure, subline, recorded/projected timeline) → Portfolio outline → Target Allocation, staleness list, Start Check-in.**

Prototype: [`prototypes/tree-ui/variant-e-narrow.html`](../prototypes/tree-ui/variant-e-narrow.html) (`?n=1|2|3`), from [`BRIEF-NARROW.md`](../prototypes/tree-ui/BRIEF-NARROW.md). `variant-e.html` was not modified.

### The measurement that reframed the ticket

Loading E at a true 390×780 viewport showed that four of the five sub-questions were already answered by existing CSS:

- **Top strip** — `flex-wrap` already wraps it into two lines (wordmark row, then Net Worth + Check-in). The "where do they go" question was moot.
- **Check-in mode** — `.e-checkin-card` is `max-width: 100%` and `eRenderCheckin` bypasses the column shell entirely. Already the best mobile surface in the app; needed no layout work.
- **Dashboard content** — `.e-dash-grid` is grid only ≥1200px and `.d-alloc-row` has a container query. It reflowed correctly; it just never got the space.
- **Plan page** — `eRerender` returns before building `.c-columns` when `eState.root === 'plan'`. Confirmed good at narrow width on review.

The entire problem was **one number**: `.c-col` at `flex: 0 0 270px` plus `.c-col-detail` at `min-width: 560px` gives the shell an **830px floor**. At 390px you got column 1 and a ~120px slice of the detail pane, with the Net Worth headline clipped mid-figure ("468,2").

### Decisions

**Breakpoint: 900px.** The 830px floor plus margin, so an 834px portrait tablet doesn't land where the shell fits but has no room for a second list column. One breakpoint only — 900–1199px already degrades acceptably.

**Below 900px, Miller columns are replaced by an accordion outline.** Asset Classes and Liabilities are expandable rows that open in place; multiple branches may be open at once; tapping a leaf opens its detail as a bottom sheet. This is structurally Variant D's tree — the shape that lost on desktop — winning on narrow for the reason it lost on wide: it shows hierarchy *and* depth simultaneously, so stale items across several classes are visible without navigating. Miller columns structurally cannot do that, which is why the desktop design needed the staleness list and column-1 markers to compensate.

**Two navigation models is deliberate, not an accident.** Desktop keeps Miller columns; narrow gets the accordion. The cost is that someone switching devices re-learns the navigation. Accepted rather than reopening [Tree-UI prototype](02-tree-ui-prototype.md), whose desktop shape is settled. The alternative considered was N1 (Miller windowed to one pane at a time), which preserves one model across widths but makes depth invisible — the phone would give no signal that anything three levels down is stale.

**Section order** puts Net Worth first because "read Net Worth" is one of only two things required to work on a phone; the outline second because it is what the user came to touch; the reference material last.

**Rejected: N3 (task-first).** It took the "only read Net Worth and record one Valuation" requirement literally — flat stale-first list, no hierarchy, Check-in as the primary CTA. Rejected on reaction, but its hypothesis (that Check-in matters more than browsing) turned out to be half-right in a way that cost nothing: Check-in already worked untouched.

### Touch affordances (apply app-wide below 900px)

Settled at brief time, not part of the variant comparison:

- **Inline click-to-edit** loses its hover signal on touch, so the editable figure carries a **persistent** 1px dotted underline plus a trailing pencil glyph. Never hover-gated.
- **Check-in's keyboard hints** (`↵ keep unchanged · L use live estimate · Esc exit`) are meaningless on touch. Replaced by real tap targets — **Keep / Use estimate / Done** — with the key bindings retained, both routed through one shared action so they cannot drift.
- **44px minimum row height** (up from 34px).
- **Top strip sticky**, so the Net Worth readout survives scrolling.
- **No horizontal scrolling.** `.c-columns` loses `overflow-x: auto` and `.c-col-detail` loses its 560px floor below the breakpoint.

### Left for the build session

- Whether the outline's expanded/collapsed state persists between visits, or resets each time. Not decided; the prototype resets.
- The bottom sheet is a second overlay concept the app doesn't otherwise use. The prototype gives it a close button plus a minimal drag-to-dismiss on the handle; the real implementation should settle the dismissal gesture properly.
