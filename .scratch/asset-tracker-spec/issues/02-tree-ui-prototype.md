Type: prototype
Status: resolved

## Answer

**Variant E — Miller-column navigation carrying the dashboard/detail information set.** Confirmed by the user 2026-09-07 after three rounds and two reaction passes. Prototype: [`prototypes/tree-ui/variant-e.html`](../prototypes/tree-ui/variant-e.html); design brief: [`prototypes/tree-ui/BRIEF-E.md`](../prototypes/tree-ui/BRIEF-E.md). Variants A–D remain in `index.html` as reference.

The shape:

- **Navigation**: Finder-style Miller columns (~270px each) with a clickable breadcrumb; the rightmost column is the detail panel. Portfolio and Plan are the two breadcrumb roots. No persistent sidebar tree.
- **Dashboard** (the rightmost column when nothing is selected): Net Worth headline, the recorded+projected timeline with a Today seam and mortgage-payoff marker, Target Allocation vs actual as horizontal bars with a target tick and money gap, and a staleness list of Valuations older than 30 days. Above ~1200px this lays out as two columns (headline + timeline beside allocation/staleness/Start Check-in); below, it stacks. A persistent Net Worth readout lives in the top strip, since Miller columns scroll the first column out of view.
- **Liabilities**: their own top-level branch with Liability Class grouping, mirroring Asset Class. The Holding↔Liability link surfaces Projected Net Position on both sides.
- **Recording**: inline click-to-edit Valuation with a backdating affordance; a Live Estimate hint with a one-click "use"; and Check-in mode — a guided pass (stale-first or all) where Enter keeps a value unchanged rather than re-recording it, `L` accepts the Live Estimate, Esc leaves, ending with the Net Worth delta.
- **Detail panel**: Valuation History table + sparkline, Live Estimate vs last Valuation, linked Liability with Projected Net Position, Amortization Assumptions as a payoff curve, Archive. (~~research prompt with copy~~ — cut 2026-09-08 by [Research-prompt templates](09-research-prompt-templates.md), which ruled the whole feature out of scope; the block was removed from `variant-e.html` and this ticket's other mentions of it below are historical record, not live spec.)
- **Plan page**: Target Allocation editor with a running total, Projection assumptions, and the timeline beneath.
- **Visual system**: near-monochrome, one desaturated slate accent reserved for selection/active, no red/green, hairlines, tabular numerals, 15px base, system light/dark, reduced-motion aware, nothing loops.
- **Icons**: one minimal single-stroke inline SVG per Asset Class and Liability Class, monochrome and inheriting the row's text color. **This overrides D's "no icons beyond chevrons" rule.** Classes only — not Holdings or Liabilities. Because users can define custom classes, an unrecognized class id must fall back to a neutral glyph as the normal path, not an error.

Carried into implementation, from the two bugs the prototype hit: an SVG containing text must never be stretched with `preserveAspectRatio="none"` — size its coordinate system to the measured container instead; and any SVG measurement must happen after the node is in the document, with a fallback for a zero measurement.

## History

Round 1 built four tree-shaped variants (A/B/C/D); D was the proposal. On reaction the user widened the question to "which UX shape suits the app at all," which spun off [App UX shape prototype](08-app-ux-shape-prototype.md) — a Balance Sheet page, no sidebar. On reaction (2026-09-07) the user rejected the Balance Sheet shape, reopening this ticket: the answer is back in the tree/Miller-column family, specifically **C's navigation + D's information**. See ticket 08 for what carries forward from the Balance Sheet exploration (Check-in mode, inline editing, Plan page, etc.) into Round 3 below.

## Question

What should the tree-like, minimal, low-stimulation navigation UI actually look and feel like?

Build a rough, concrete prototype (use the Fable model for this) of the proposed shape — a collapsible sidebar tree (Portfolio → Asset Class → Holding, file-explorer-like) with a single main content pane showing whatever's selected — and use it to confirm or revise the structure. While prototyping, also surface first-cut takes on:
- What the root/dashboard view shows (presumably Net Worth headline + Target Allocation vs. actual + something projection-related)
- What chart type best fits the portfolio-distribution view (pie/donut/treemap/bar — pick whatever reads as "minimal, not visually stimulating")
- How a Liability shows up in the tree (its own branch, or folded into the relevant Asset Class-like grouping)

## Prototype (in progress — awaiting the human's reaction)

Asset: [`prototypes/tree-ui/index.html`](../prototypes/tree-ui/index.html) — one self-contained HTML file, three structurally different variants switchable via `?variant=A|B|C` and a floating bottom bar (←/→, arrow keys). Design brief authored by Fable; coding handed to Sonnet. Open from disk, or via the published artifact: <https://claude.ai/code/artifact/873036fb-7a56-4b0d-8317-da1abd9c88e6> (private; use `?variant=A|B|C` or the bottom bar). Projection figures in the prototype are illustrative only — the trajectory math was not verified against the Projection-method ticket and is not what this ticket decides.

Each variant varies three things at once, so reacting to one variant is reacting to a bundle — the useful feedback is "the tree from X, the Liability placement from Y, the chart from Z".

| Variant | Where the tree lives | Liability in the tree | Distribution chart |
|---|---|---|---|
| A · Explorer | Fixed left sidebar, 3-level file-explorer tree; main pane shows selection | Own **Liabilities** branch, sibling of the Asset Classes, grouped by Liability Class | Paired horizontal bars per Asset Class: filled actual %, hollow tick at target % |
| B · Outline | No sidebar; the page is one collapsible outline; Holding detail expands inline | Linked Liability **folded under the Holding it financed** (mortgage under 123 Main St, with net position); unlinked ones in a residual Liabilities group at the bottom | One stacked 100% strip (actual) over a thinner strip (target), same segment order, so misalignment shows |
| C · Columns | Finder-style Miller columns + clickable breadcrumb; rightmost column is the detail panel | Own branch (like A) **and** the linked Liability + Projected Net Position also appear on the Holding's detail | Plain table with inline bars: actual · bar · target · Δ, sorted by |Δ| |

First-cut takes baked into the brief (to confirm or overturn on reaction):

- **Root/dashboard content**: Net Worth headline with "Holdings − Liabilities" breakdown and as-of date; Target Allocation vs actual distribution; a small single-stroke Projection line with the assumption sentence and the year-20 figure. In that priority order; the Projection is deliberately not the hero.
- **Chart type**: no pie/donut/treemap anywhere. Horizontal bars (A) are the recommended default — they read left-to-right like the tree, put actual and target on the same track, and don't need a legend. B's strip is the most compact; C's table is the least "chart-like".
- **Liability placement**: recommended default is A/C's own branch (mirrors the Asset Class / Liability Class symmetry in CONTEXT.md and the schema), with the Holding↔Liability link surfaced on the Holding detail as in C. B's folding is the alternative to react against: it makes Projected Net Position visible in the tree itself but leaves unlinked Liabilities in an awkward residual group.
- **Visual system**: near-monochrome, one desaturated slate-blue accent (selected node + actual bars only), no red/green, no icons beyond chevrons, tabular numerals, hairlines not boxes, 26–28px tree rows.

### Round 2 — Variant D · Proposal (2026-09-07)

The user kept A/B/C as reference and asked for a free-hand recommendation: minimal, clean animation, informative. D is that recommendation, added to the same file and made the default variant. It is the proposed answer to this ticket, pending the user's reaction.

**Shape**: A's persistent 272px sidebar tree (Portfolio → Asset Class → Holding; Liabilities as own branch → Liability Class → Liability) + a single scrolling content pane with a sticky breadcrumb strip. Reasoning: the data is three levels deep and small (a handful of classes, tens of Holdings); a persistent tree that never moves is what "file-explorer-like" buys, and putting values in the rows makes the tree itself a readable balance sheet. Miller columns (C) spend width on a shallow tree; an outline (B) makes the page jump when detail expands inline.

**Liability placement**: own branch (mirrors Asset Class ↔ Liability Class in CONTEXT.md and the schema), with the Holding ↔ Liability link surfaced on the Holding's detail as "Linked Liability" + Projected Net Position, and reciprocally "Financed Holding" on the Liability. Folding (B) hides the link inside one class and strands unlinked Liabilities in a leftover group.

**Dashboard content, in order**: (1) Net Worth headline with "Holdings − Liabilities · as of". (2) **One timeline** joining recorded Net Worth (from Valuation History, solid line) and projected Net Worth (dashed line) on one continuous y-scale with a "Today" seam, a marker at the mortgage payoff year, and an endpoint label. (3) **Target Allocation vs actual** as horizontal bars in tree order with a target tick, plus the money gap ("257,155 below target"), because the gap in home currency is the actionable number. (4) A quiet **staleness** list of Valuations older than 30 days, linking into the tree.

**Chart type**: horizontal bars with a target tick. A pie/donut can't show a target, needs a legend, and asks for angle comparison. Tree order (not size order) so the eye maps sidebar rows to chart rows.

**Informative touches specific to this domain**: staleness dimming in the tree (the app's core loop is recording Valuations); Live Estimate shown with "% vs last Valuation · not a Valuation until you record it"; Amortization Assumptions rendered as a payoff curve + payoff year; Projected Net Position on both sides of a Holding↔Liability link.

**Motion** (all reduced-motion aware, none looping): sliding 2px selection indicator (200ms), animated expand/collapse with rotating chevron (180ms), content-pane fade+4px rise (180ms), bars grow once (400ms, 40ms stagger), lines draw in once (600ms), design-notes panel slides in (220ms). No count-up numbers.

**Keyboard**: tree is a `role="tree"` with ↑/↓/←/→/Enter, file-explorer style.

D also carries an in-app "Why this design" panel with the rationale, so the prototype explains itself to whoever opens it.

**Status after round 2**: D is built, published to the same artifact (v3), verified rendering in Chrome (dark theme). One fix was needed after Sonnet's pass: the timeline measured its polyline before the SVG was attached to the document, which throws in Chrome and blanked the whole content pane; the draw-in is now deferred a frame with a fallback. A/B/C untouched.

**Surfaced for the map**: the projected Net Worth line doesn't bend at the mortgage payoff marker, because the Projection-method Answer's core formula (P = Net Worth) and its Liabilities section (amortize separately) don't compose. Filed as [Projection formula reconciliation](07-projection-formula-reconciliation.md). Not this ticket's decision.

**Round 2 outcome**: superseded by the wider UX-shape question (spun off to [App UX shape prototype](08-app-ux-shape-prototype.md)), then reinstated when that ticket's Balance Sheet answer was rejected — see History above.

### Round 3 — Variant E · C's navigation + D's information (2026-09-07)

On reaction to Round 2/ticket 08, the user's direction: **navigation from Variant C** (Miller-style columns + clickable breadcrumb, rightmost column is the detail panel — not D's persistent left sidebar), **information from Variant D** (the dashboard content: Net Worth headline + recorded/projected timeline, Target Allocation bars with money gap, staleness list, the "informative touches" — staleness dimming, Live Estimate hint, Amortization payoff curve, Projected Net Position on both sides of a link), plus what carries forward from ticket 08 (Check-in mode, inline click-to-edit Valuation with backdating, Live Estimate "use" action, a separate Plan page for Target Allocation + Projection assumptions, research-prompt-with-copy and Archive as detail-panel actions).

**Brief written, not yet built.** Design brief: [`prototypes/tree-ui/BRIEF-E.md`](../prototypes/tree-ui/BRIEF-E.md) — Miller-column shell from C (fixed 220px list columns, flexible detail column, clickable breadcrumb) carrying D's dashboard/detail content, plus the salvaged 08 interactions. Key syntheses it resolves: the root dashboard is the rightmost column when the path is empty, compensated by a persistent Net Worth readout in the top strip (Miller columns scroll column 1 out of view, which D's sidebar never did); Check-in mode suspends column browsing for a linear one-card-at-a-time queue; Plan is a second breadcrumb root, sibling to "Portfolio". It also flags that ←/→ are already bound to the variant switcher, so column navigation uses ↑/↓ plus Tab order.

Written by **Sonnet, not Fable** (one-time deviation from this effort's prototype convention — Fable was out of usage credits on 2026-09-07).

**E lives in its own file**, [`prototypes/tree-ui/variant-e.html`](../prototypes/tree-ui/variant-e.html) — not as a fifth `?variant=` inside `index.html`. Reason: two build attempts on 2026-09-07 died in the *reading* phase, because adding a variant to the 2969-line shared file meant reading ~1700 lines (shared helpers + all of C + all of D) before writing a line. E is the proposed answer rather than one option among five, so it doesn't need the switcher; A–D stay in `index.html` as untouched reference. The standalone file was seeded by hand from the shared design tokens, the shared `DATA`/helpers, C's Miller-column mechanics, and D's information payload (alloc bars, timeline, sparkline, staleness list, per-node views, breadcrumb segments), leaving the coding agent only E's own code to write.

**Built and verified in Chrome (2026-09-07).** Awaiting the user's reaction. Note the file has no `<meta charset>` problem now — one was added, because unlike `index.html` (which relied on the artifact wrapper to supply a charset) a standalone file served or opened directly renders `·` and `−` as mojibake without it.

Verified working: Miller columns with breadcrumb and drill-down; dashboard column (Net Worth headline, recorded+projected timeline with Today seam and payoff marker, allocation bars with target tick and money gap); Holding detail (staleness "37 days ago · older than 30 days", Valuation History table + sparkline, Linked Liability with Projected Net Position, research prompt with Copy, Archive); Check-in mode (takeover, "1 of 1" progress, `↵ keep unchanged · L use live estimate · Esc exit` legend, pre-filled value, end-of-pass Net Worth delta correctly showing 0 after an Enter-unchanged pass); Plan page (Target Allocation editor with running total, Projection assumptions, own timeline mount). Editing Projection years live-rescales the timeline (axis, tick labels, endpoint label, payoff-marker clamping) without blanking the pane — the coding agent parameterized the previously-hardcoded 20-year horizon on its own initiative to avoid an index-past-array-end blanking bug of the same class as Round 2's.

#### Reaction 1 (2026-09-07): shape confirmed, three revisions

"Looks good" — the C-navigation + D-information shape is **confirmed**. Three changes asked for, none structural:

1. **Larger type.** Base was 13px; raised to 15px with the ramp scaled proportionally, and the Miller columns widened so larger names don't ellipsize.
2. **Minimal icons per class.** This **overrides D's "no icons beyond chevrons"** rule, which E had inherited unexamined — worth carrying into the spec, since it changes the visual system. Constraints kept: single-stroke inline SVG (the file stays self-contained), monochrome inheriting the row's text color, never the slate accent (which stays reserved for selection). Classes only, not Holdings or Liabilities. **A fallback glyph is required** because the product lets users define custom Asset and Liability Classes, so an unrecognized class id is the normal path, not an error — a detail that will carry into the real implementation.
3. **Use the horizontal space.** The dashboard was capped at 760px, stranding ~900px of a wide window. Now a two-column layout above ~1200px (headline + timeline beside allocation bars, staleness list, Start Check-in), falling back to the current single-column stack below the breakpoint. Plan page and the Check-in card likewise widened/centered.

The empty-space problem was visible only at a wide viewport — the earlier verification pass ran at 1288px and read it as a minor aesthetic note rather than the main thing wrong with the screen.

**Two regressions the revision introduced, both since fixed:**

- **Allocation tracks collapsed to ~55px stubs.** Bigger type plus the new icon widened the label, and the figures ("69.0% · target 25%" over "395,303 above target") are wide, so the flexible track was crushed inside the narrower dashboard aside — making the target tick invisible and defeating the chart's purpose. Fixed by giving the track a 160px floor and reflowing the row: label and figures share a line, the track spans full width beneath.
- **SVG text horizontally stretched.** The revision had reached for `preserveAspectRatio="none"` to make the timeline fill its wider container, which scales x and y independently and distorts every `<text>` in the SVG — clearly visible on the Plan page's axis labels. Fixed properly: the chart now measures its container after attach and sets the `viewBox` width to the measured pixel width, so there is no non-uniform scaling, with a debounced `resize` re-render. (The Valuation-History sparkline still uses `preserveAspectRatio="none"`, which is fine — it carries no text.)

**Verification status.** Confirmed in Chrome at a 1288px viewport: two-column dashboard, icons on class rows / allocation bars / detail headlines, allocation tracks legible with visible target ticks, crisp axis labels, Plan page two-column with full-width timeline, and editing Projection years rescaling the chart without blanking. **Not confirmed**: the ~2000px appearance the user actually reported from, and the debounced resize handler — the verifying display clamps the browser viewport to 1288px, so neither could be exercised. Both want a look on the user's own screen.

**To view it**: standalone file, but `file://` URLs can't be driven by the Chrome extension, so it was served locally (`python3 -m http.server` in `prototypes/tree-ui/`). Opening the file directly in a browser by hand works fine.

**To close this ticket**: the user confirms E (or names changes), then this "Round 3" section becomes the `## Answer`, and CONTEXT.md gets a "Check-in" entry only if the user wants it named as a domain concept rather than a UI mode.
