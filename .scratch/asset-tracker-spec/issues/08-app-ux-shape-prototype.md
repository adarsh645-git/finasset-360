Type: prototype
Status: resolved

## Answer

Rejected on reaction (2026-09-07): the user did not like the Balance Sheet design. The UX-shape question reopens at [Tree-UI prototype](02-tree-ui-prototype.md) (Round 3), which combines Variant C's Miller-column navigation with Variant D's information content — a one-page, no-sidebar Balance Sheet is no longer the shape.

What carries forward from this ticket into Round 3, because it's shape-independent (the agent's call, per the user's "pick only things you deem useful and discard the ticket"):

- **Check-in mode**: a guided pass over Holdings (stale-first or all), pre-filled with the last value so Enter = unchanged, one key accepts a Live Estimate, progress ("12 of 27"), Esc to leave, ends with the Net Worth delta since last check-in.
- **Inline click-to-edit Valuation**: click a value, type, Enter/blur records a Valuation dated today, with a small date affordance for backdating.
- **Live Estimate "use" action**: one-click accept of the live-priced estimate as the recorded Valuation, not just a passive hint.
- **Plan page as its own area**: Target Allocation editor (percent per Asset Class, actual beside it, running total to 100) plus Projection assumptions, above the recorded+projected Net Worth timeline — kept separate from the exploration/detail view.
- **Research prompt with copy** and **Archive** as detail-panel actions.
- **Session-rhythm facts** (kept as project context, not shape): monthly check-in touching 10–30 Valuations, plus several distribution-only visits a month; desktop-first, with only "read Net Worth" and "record one Valuation" required on a phone.

Discarded as specific to the rejected shape: one-page-is-the-portfolio, no-sidebar chrome, non-collapsible sheet sections sorted by value, the header-band layout, "Sheet · Plan" top-bar tabs.

## Question

What UX shape suits FinAsset 360 best? Supersedes [the tree-UI prototype](02-tree-ui-prototype.md), whose question presupposed a file-explorer tree. The user freed the choice ("tree style is just one option, strictly do not stick to it") and asked for a single recommended shape, prototyped and reacted to.

Build one shape well (not several bundled variants) and use it to confirm or revise the structure. The prototype must demonstrate: (1) recording a Valuation inline and in a Check-in pass, (2) Net Worth and distribution vs Target Allocation, (3) Holding detail with Valuation History, Live Estimate and linked Liability, (4) the Projection timeline (illustrative, pending [formula reconciliation](07-projection-formula-reconciliation.md)), and (7) a narrow-viewport pass. Add Holding and Archive are non-functional buttons.

## Settled in the grilling (2026-09-07)

Facts that shaped the choice, from the user:

- **Session rhythm**: a monthly check-in where 10–30 Valuations get updated, *plus* several visits a month just to look at the distribution. So distribution must be on the first screen.
- **Device**: desktop-first; on a phone only "read Net Worth" and "record one Valuation" need to work.

Decisions:

- **Shape: Balance Sheet.** One page *is* the Portfolio. Chosen over a tree sidebar (existing D), a dashboard-with-tabs, and a check-in-first wizard. Reasoning: the data is small (a handful of classes, tens of Holdings, three levels) and fits one screen; a tree hides totals behind clicks and spends a column on navigation the data doesn't need; tabs split the balance sheet and make the monthly pass a multi-page chore. A balance sheet is how people already think about net worth, and inline entry makes the check-in a top-to-bottom pass down one column. The check-in-first idea survives as a *mode* inside the sheet.
- **Landing page**: the Sheet, with a header band: Net Worth headline (Holdings − Liabilities, as-of) left; distribution vs Target Allocation as horizontal bars with a target tick and money gap, in sheet order, right; a Check-in button and a stale count.
- **Sheet**: sections per Asset Class, then Liability Classes with their own subtotal; Net Worth = the two subtotals. Columns: Name · Value (native currency, editable inline) · in home currency · as-of (30-day staleness dimming) · share of Portfolio. Live-priced rows show the Live Estimate as a hint under the value with one-click "use". Linked Holding/Liability rows carry a link glyph; Projected Net Position lives in the drawer only. Rows sort by home-currency value descending; sections are not collapsible.
- **Editing**: click, type, Enter/blur records a Valuation dated today; a small date affordance for backdating.
- **Check-in mode**: visits every row top to bottom, pre-filled with the last value so Enter = unchanged (not re-recorded); one key accepts a Live Estimate; progress "12 of 27"; Esc leaves; ends with Net Worth change since last check-in. The stale count starts a stale-only pass (the one exception to visit-every-row).
- **Detail**: right-hand drawer (~420px), sheet stays visible: Valuation History table + sparkline, Live Estimate vs last Valuation, linked Liability with Projected Net Position (reciprocal "Financed Holding" on a Liability), Amortization Assumptions on a Liability, research prompt with copy, Archive.
- **Plan page**: Target Allocation editor (percent input per Asset Class, actual beside it, running total to 100) and Projection assumptions above the recorded + projected Net Worth timeline. Amortization Assumptions are edited in the Liability drawer, not here.
- **Chrome**: one thin top bar (app name, Sheet · Plan, home currency, account). No sidebar.
- **Visual system and motion**: D's carried unchanged (near-monochrome, one slate accent, no red/green, tabular numerals, hairlines, follows system light/dark, reduced-motion aware, nothing loops). New motion only: the check-in focus moving row to row, and a value cell settling when recorded.
- **Narrow viewport** (< 720px): sheet keeps Name · Value · as-of; header stacks; drawer goes full-screen; check-in still works.
- **Format**: one self-contained HTML file, fictional data (~24 Holdings across 6 Asset Classes, 4 Liabilities, USD home + two other currencies, a house linked to a mortgage), published as a private artifact. Fable wrote the brief; Sonnet coded it.

## Prototype

Asset: [`prototypes/balance-sheet/index.html`](../prototypes/balance-sheet/index.html). Brief: [`prototypes/balance-sheet/BRIEF.md`](../prototypes/balance-sheet/BRIEF.md). _(artifact link and verification notes added once built)_

## To close this ticket

The user confirms the Balance Sheet shape (or names changes); this section becomes the `## Answer`; the map's fog line on mobile responsiveness gets narrowed to what the narrow-viewport pass left open; CONTEXT.md gets no new terms unless the reaction introduces one ("Check-in" is a UI mode, not a domain concept, unless the user wants it named).
