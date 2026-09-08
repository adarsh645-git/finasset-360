# Brief: FinAsset 360 "Balance Sheet" prototype

Throwaway UX prototype. One self-contained HTML file: `index.html` in this directory. No build step, no framework, no external requests. Plain ES5-ish JS is fine; modern CSS is fine. Fictional data. Nothing persists across reloads.

Decisions in this brief are settled (see `../../issues/08-app-ux-shape-prototype.md`). Do not add features, pages, or variants beyond what is written here. Where the brief is silent, choose the quieter option.

## Artifact constraints (hard)

- The file is published as a claude.ai artifact, which wraps it in its own `<!doctype html><html><head>…</head><body>` skeleton. So: **no** `<!DOCTYPE>`, `<html>`, `<head>`, or `<body>` tags. Start the file with an HTML comment, then `<title>FinAsset 360 Balance Sheet</title>`, then `<style>`, then markup, then `<script>`.
- It must also open directly from disk (`file://`) and behave the same.
- Theme: define the full light palette on bare `:root`; redefine tokens under `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {…} }`; redefine again under `:root[data-theme="dark"] {…}`. Give `body` an explicit `background: var(--bg)`. Copy the token block from `../tree-ui/index.html` lines 1–95 verbatim (colors, reset, fonts, reduced-motion rules, button reset). Do not invent new colors except one: `--stale-dot` is not needed; staleness is opacity only.
- No external fonts, images, or libraries. Inline SVG only.
- `[hidden]{display:none!important}` is provided by the host; toggle visibility with `el.hidden`.

## Reuse from `../tree-ui/index.html`

Copy these helpers (they are already correct): `seededRandom`, `genHistory`, `fmtMoney`, `fmtPct`, `fmtDate`, `fv`, `monthlyPayment`, `amortizeBalance`, `payoffMonths`, `computeAmortizationInfo` (adapt field names to the data below). Copy the D-variant timeline SVG approach from `dRenderDashboard`/its timeline function, including the fix where the polyline length is measured one animation frame *after* the SVG is in the document (measuring before attach throws in Chrome). Do not copy any of the A/B/C/D layout code or CSS.

## Fixed "today"

`TODAY = "2026-09-07"`. Staleness threshold: a Valuation whose `recorded_at` is more than 30 days before TODAY is stale. Last check-in date: `2026-08-10`.

## Data

Home currency USD. FX to USD: `EUR 1.09`, `INR 0.012`, `USD 1`.

Price cache (fetched `2026-09-07T06:00Z`, all USD): `AAPL 232.10, VTI 298.40, MSFT 512.30, NVDA 178.60, SCHD 27.90, VXUS 71.20, XAU 3412 (per oz), XAG 41.80 (per oz), BTC 118400, ETH 4120, SOL 212`.

Asset Classes, in this fixed order (sheet order everywhere):

| Class | Target % |
|---|---|
| Real Estate | 35 |
| Equity | 35 |
| Precious Metal | 10 |
| Cash | 10 |
| Crypto | 5 |
| Vehicles | 5 |

Holdings. `symbol`+`qty` set means live-priced; otherwise manual. `amount` is the latest Valuation in the Holding's own `currency`; `as_of` its date.

Real Estate
- `123 Maple St` USD 785000 as_of 2026-07-02 (linked to the mortgage below)
- `Flat in Pune` INR 9200000 as_of 2026-05-20

Equity
- `AAPL` USD, symbol AAPL, qty 120, amount 27240 as_of 2026-08-10
- `VTI` USD, symbol VTI, qty 310, amount 90210 as_of 2026-08-10
- `MSFT` USD, symbol MSFT, qty 45, amount 22590 as_of 2026-08-10
- `NVDA` USD, symbol NVDA, qty 60, amount 10380 as_of 2026-08-10
- `SCHD` USD, symbol SCHD, qty 400, amount 11040 as_of 2026-08-10
- `VXUS` USD, symbol VXUS, qty 250, amount 17500 as_of 2026-08-10
- `Vanguard 401(k)` USD 214300 as_of 2026-08-10
- `Roth IRA` USD 68900 as_of 2026-07-28

Precious Metal
- `Gold coins` USD, symbol XAU, qty 12, amount 40560 as_of 2026-08-10
- `Gold jewellery` INR 1620000 as_of 2026-06-11 (180 g, manual; put "180 g" in the name hint)
- `Silver bars` USD, symbol XAG, qty 100, amount 4090 as_of 2026-08-10

Cash
- `Chase checking` USD 14250 as_of 2026-09-01
- `Marcus savings` USD 62000 as_of 2026-09-01
- `HDFC savings` INR 1450000 as_of 2026-08-10
- `N26 account` EUR 8400 as_of 2026-08-10
- `Emergency fund CD` USD 25000 as_of 2026-07-15

Crypto
- `Bitcoin` USD, symbol BTC, qty 0.85, amount 98600 as_of 2026-08-10
- `Ether` USD, symbol ETH, qty 6.2, amount 24800 as_of 2026-08-10
- `Solana` USD, symbol SOL, qty 140, amount 26600 as_of 2026-08-10

Vehicles
- `2022 Tesla Model Y` USD 31500 as_of 2026-08-10
- `2018 Honda CR-V` USD 17800 as_of 2026-06-30

Liability Classes, in order: Mortgage, Auto Loan, Credit Card, Student Loan.

Liabilities (balance = latest Valuation):
- Mortgage: `Mortgage · 123 Maple St` USD 412300 as_of 2026-08-10. Amortization Assumptions: rate 6.25%, original 520000, term 360 months, start 2021-08-01, custom payment none, extra 300/month. `linked_holding` = 123 Maple St.
- Auto Loan: `Tesla loan` USD 18900 as_of 2026-08-10. Amortization: rate 4.9%, original 38000, term 60, start 2023-03-01, extra 0.
- Credit Card: `Chase Sapphire` USD 3240 as_of 2026-09-01. No amortization.
- Student Loan: `Federal student loan` USD 12600 as_of 2026-07-20. No amortization.

Valuation History: generate 24 monthly points ending at each item's latest Valuation with `genHistory` (seeded by name, low volatility for cash/vehicles/real estate, higher for crypto). Recorded Net Worth history for the timeline is the sum of those per month (Holdings minus Liabilities, converted at the fixed FX above).

Projection defaults: growth 6%/yr, contribution 2500/month, horizon 20 years. Illustrative only: project Holdings total with `fv`, subtract Liabilities (amortized ones via `amortizeBalance`, others flat). Label the chart "Illustrative · formula pending reconciliation".

Stale rows given these dates: Flat in Pune, Roth IRA, Gold jewellery, Emergency fund CD, 2018 Honda CR-V, Federal student loan → header shows "6 stale".

## App chrome

Top bar, 44px, sticky, `border-bottom: 1px solid var(--border)`, background `var(--bg)`:
- Left: wordmark "FinAsset 360" (12px, muted, letter-spacing .02em).
- Then nav: "Sheet" · "Plan" as text buttons, 13px; active one in `var(--text)` with a 2px `var(--accent)` underline; inactive muted. Routing via `location.hash` (`#sheet` default, `#plan`).
- Right: "USD" chip (11px, hairline border, radius 3px), a 24px circle with initials "AR" (surface bg, muted text), and a "Why this design" text link (11px, underlined, muted) that opens the notes panel (see end).

No sidebar. Content max-width 1120px, centered, padding 32px 40px.

## Sheet page (landing)

### Header band

Two columns, gap 48px, `align-items: start`, margin-bottom 40px. Left column fixed 320px; right column fills.

Left:
- Label "NET WORTH" (11px uppercase, muted, letter-spacing .06em).
- Figure: 36px, weight 500, tabular. Computed live: Holdings total − Liabilities total, in USD.
- Subline (12px muted): `Holdings 2,143,000 − Liabilities 447,040 · as of 7 Sep 2026` (as-of = the newest Valuation date among all items).
- Row of two controls, margin-top 16px, gap 8px: **Check-in** button (hairline border, 12px, padding 6px 14px, radius 4px; hover `var(--row-hover)`), and **"6 stale"** as a text button (12px, muted, underlined with border-colored underline; hover text color). If 0 stale, hide the stale button.
- Under those, 11px muted: `Last check-in 10 Aug 2026`.

Right, "Distribution vs target":
- Caption row: "DISTRIBUTION" label left, right side 11px muted "actual · target ┆".
- One row per Asset Class in sheet order, 34px tall: name (120px, 13px), track (flex, 6px tall, `var(--border)` bg, radius 2px) with an accent fill sized to actual % and a dashed 1px tick at target % (`.d-alloc-target` style from tree-ui), then figures column right-aligned 140px: line 1 `41.2% · 35%` (13px, actual bold-ish 500, target muted), line 2 (11px muted) the money gap in USD: `+105,700 above target` or `257,155 below target`, computed as (target% − actual%) × Holdings total. Use "above"/"below" words, never color.
- Fill widths animate from 0 once on first render (400ms ease-out, 40ms stagger). No re-animation on data edits: just transition width 300ms.
- Bars scale so that the largest of (actual, target) across classes is ~92% of track width; do not scale to 100% = full track, values are small.

### Sheet table

One `<table>` with 5 columns. Column widths: Name flex; Value 160px right-aligned; "in USD" 130px right; "as of" 90px right; Share 70px right. Header row: 11px muted, weight 400, hairline bottom.

Section header rows (one per Asset Class, then per Liability Class): 13px weight 500 name in Name cell, subtotal in "in USD" cell, share in Share cell; top padding 22px so sections breathe, hairline bottom. Above the first Liability Class insert a block heading row "LIABILITIES" (11px uppercase muted) with the Liabilities subtotal in the "in USD" cell. Above the first Asset Class insert the same for "HOLDINGS".

Item rows, 40px tall, hairline bottom, hover `var(--row-hover)`, cursor pointer (whole row opens the drawer except the Value cell and its hint):

- **Name cell**: name (13px). Beneath, an 11px muted hint line when relevant: live rows `120 × AAPL`; the jewellery `180 g`. If the item is part of a Holding↔Liability link, append a small inline SVG link glyph (two chain links, 12px, muted) after the name with `title="Linked to Mortgage · 123 Maple St"` / `"Financed 123 Maple St"`.
- **Value cell**: the editable cell. At rest: the amount in the item's currency (13px, tabular), and, only when the currency is not USD, a trailing muted currency code (`9,200,000 INR`). Liability amounts use `var(--liability)` color. Beneath, for live rows only, an 11px muted hint: `Live 27,852 · +2.2%` followed by a text button `use` (underlined). "+2.2%" is Live Estimate vs latest Valuation (sign shown, still muted, never colored). The hint is hidden while the cell is being edited.
- **in USD cell**: amount × fx, 13px tabular. Liabilities in `var(--liability)`.
- **as of cell**: `2 Jul` for the current year, `20 May 26` never needed since all dates are 2026, so use `D MMM`. If stale: `opacity: .55` and `title="Stale · 67 days"`. If recorded today: show `Today`.
- **Share cell**: item's USD value ÷ Holdings total, 1 decimal, muted 12px. For Liabilities show the share of Liabilities total, same style.

Rows within a section sort by USD value descending. Re-sort only on page render, not live while editing (a row jumping under the cursor is worse than a briefly unsorted list); re-sort after a drawer closes or a check-in ends.

Final row after the Liabilities block: "Net Worth" (13px weight 500) with the figure in "in USD", top border 1px `var(--text-muted)`.

### Inline editing (the core interaction)

- The Value cell's amount is a `<button class="val">` at rest (so it is keyboard reachable with Tab). Clicking or pressing Enter/Space on it swaps in an `<input type="text" inputmode="decimal">` styled to look identical (same font-size, right-aligned, no border, `background: var(--accent-soft)`, radius 3px, padding 2px 6px), pre-filled with the raw number (no thousands separators), all text selected.
- Beneath the input a tiny 11px muted line: `as of today ▾`. Clicking it reveals an `<input type="date">` (value TODAY, max TODAY) in place of the caption. This is the backdating affordance; leave it out of the way otherwise.
- **Enter** or **blur** commits. Parse: strip commas and spaces; reject NaN or negative (shake 2px, 120ms, keep editing). If the value equals the current latest amount **and** the date is today → no Valuation recorded, cell returns to rest. Otherwise record: if a Valuation already exists on that date, overwrite it; else push one. Then re-render the affected row, section subtotal, header figures, and distribution bars (transitions, not re-animation).
- **Esc** cancels.
- **Settle animation** on record: the cell background goes `var(--accent-soft)` → transparent over 600ms ease-out. The as-of cell updates to `Today` with its opacity restored.
- `use` on the live hint: sets the amount to the Live Estimate and records it dated today (same settle). The `%` hint then reads `Live 27,852 · 0.0%`.

### Check-in mode

Entered via the Check-in button (all rows) or the "6 stale" button (stale rows only). Behaviour:

- A sticky strip appears directly under the top bar (44px, `var(--surface)` bg, hairline bottom, z-index above the table): left `Check-in · 3 of 27` (13px; "Stale check-in · 1 of 6" for the stale pass); center 11px muted: `Enter keep or record · L use Live Estimate · ⇧Enter back · Esc leave`; right: text button `Leave`.
- Order: every item row in sheet order (Holdings then Liabilities), or only stale rows.
- The current row gets a 2px `var(--accent)` indicator on its left edge. Implement as one absolutely positioned element inside the table wrapper that `transform: translateY()`s to the current row (200ms cubic-bezier(.2,.8,.2,1)), same idea as D's sidebar indicator, so it visibly slides row to row. The current row also gets `var(--row-hover)` background. Scroll the row into view with `block: "center"` (smooth, unless reduced motion).
- The current row's Value cell is put straight into edit mode, pre-filled with the last amount, selected.
- **Enter**: commit exactly as inline editing (unchanged → nothing recorded, counts as "kept"; changed → recorded, counts as "updated"), then advance. **Shift+Enter**: commit and go back one. **L** (when the row is live-priced; ignore otherwise): fill with the Live Estimate, then behave as Enter. **Esc** or Leave: commit nothing for the current row, leave the mode.
- Visited rows show a small `✓` (11px muted) before the as-of text: kept rows keep their as-of; updated rows show `Today`.
- After the last row, the strip is replaced (same position, 220ms fade) by a summary strip: `Check-in done · 9 updated · 18 kept · Net Worth 1,695,960 → 1,712,300 (+16,340 since 10 Aug)` and a `Done` text button. Net Worth "before" is the figure at mode entry. "Since 10 Aug" refers to the last check-in date; after Done, set last check-in to TODAY and update the header's "Last check-in" line. Done dismisses the strip and re-sorts the sheet.
- The drawer cannot be opened during a check-in (row clicks are ignored except on the value cell).

### Detail drawer

Opens on row click (not during check-in). Fixed right panel, width 420px, full height under the top bar, `var(--surface)` bg, `border-left: 1px solid var(--border)`, slides in from the right 220ms cubic-bezier(.2,.8,.2,1). A scrim over the rest of the page (`rgba(0,0,0,.18)` light / `.4` dark, fades 220ms); click scrim or press Esc or the × (top-right, 12px) to close. Body scroll stays enabled for the sheet; drawer scrolls independently. Padding 28px 28px 40px. Section gaps 28px; section labels 11px uppercase muted.

Holding drawer, top to bottom:
1. Class name (11px muted), Holding name (18px weight 500), hint line (`120 × AAPL` / `180 g` / currency if not USD).
2. **Latest Valuation**: figure 24px tabular in own currency, subline `≈ 27,240 USD · 10 Aug 2026` (subline shows USD only if currency ≠ USD; always shows date). Stale rows: append ` · stale` muted.
3. **Live Estimate** (live rows only): figure 20px, subline `+2.2% vs last Valuation · not a Valuation until you record it` (12px muted), button `Record Live Estimate` (hairline, 12px) which records it dated today with the same settle behaviour in the sheet behind.
4. **Valuation History**: sparkline SVG (full width, 48px tall, single 1.5px `var(--accent)` stroke, no axes, draws in once 600ms) over a table of the last 12 points: date · amount (own currency) · USD. 12px, hairline rows. Newest first.
5. **Linked Liability** (only 123 Maple St): `Mortgage · 123 Maple St` (clickable text, opens that Liability's drawer), `Balance 412,300 USD`, then `Projected Net Position today 372,700` (Holding USD value − balance), and one more line `Payoff · 2044 (illustrative)` using `payoffMonths`.
6. **Research prompt**: a `<details>` whose summary reads "Research prompt" (13px); inside a `<pre>` (12px monospace, `var(--bg)` background, radius 4px, padding 12px, pre-wrap) with a placeholder prompt per Asset Class (2–3 sentences, e.g. for Real Estate: "Estimate the current market value of a property at {address}. Consider recent comparable sales within 1 mile in the last 6 months, current listing prices, and local price trends. Give a single point estimate and a range."), plus a `Copy` text button (uses `navigator.clipboard.writeText`, shows "Copied" for 1.2s).
7. Footer row: `Record Valuation` (hairline button, closes the drawer and puts that row's Value cell into edit mode) and `Archive` (text button, muted; on click shows a 11px inline note "Not in this prototype" for 1.5s; nothing else).

Liability drawer:
1. Liability Class, name (18px), currency hint.
2. **Balance**: 24px figure in `var(--liability)`, subline date, stale marker.
3. **Financed Holding** (linked only): `123 Maple St` clickable (opens its drawer), `Value 785,000 USD`, `Projected Net Position today 372,700`.
4. **Amortization Assumptions**: a small form, 2 columns of labeled inputs (12px labels muted, inputs hairline, right-aligned numbers): Interest rate %, Original amount, Term (months), Custom monthly payment (blank = derived), Extra monthly payment, Start date. For Liabilities without them, show the form empty with a 12px muted line "None set · balance held flat in Projection". When set, beneath the form: `Payment 3,201/mo (derived) + 300 extra · Payoff Feb 2044 · illustrative` and a small payoff-curve SVG (48px tall, 1.5px `var(--liability)` stroke, balance from today to payoff). Inputs are live: editing them recomputes the line and curve. (They do not need to affect the Plan page's timeline; keep it simple.)
5. **Balance History**: same as Valuation History (sparkline + 12-row table), stroke `var(--liability)`.
6. Footer: `Record Balance` and `Archive` as above.

Narrow (<720px): the drawer is full-screen (width 100%), with a `← Back` text button at top-left instead of ×.

## Plan page

Same top bar. Content max-width 1120px, two columns (grid `1fr 1.4fr`, gap 56px), stacked under 900px.

Left, **Target Allocation**:
- Label "TARGET ALLOCATION", 12px muted line "Goal share per Asset Class. Compared against actual on the Sheet."
- A table: Class · Target % (an `<input type="number" min=0 max=100 step=1>`, 64px, right-aligned, hairline) · Actual % (muted) · Gap (USD, `+105,700` / `−257,155`, muted 12px).
- Footer row: `Total` and the sum; if ≠ 100 show `97% · 3% unallocated` or `103% · 3% over` in muted text (no red). Edits update the sum live and update the Sheet's bars when you navigate back.

Right, **Projection**:
- Label "PROJECTION", 12px muted "One shared set of assumptions."
- Three inputs on one row: Growth %/yr (6), Contribution /month (2500), Horizon years (20). Hairline inputs, 12px labels above.
- Timeline SVG (full width, 220px tall): recorded Net Worth for the past 24 months as a solid 1.5px `var(--accent)` line, then projected year-by-year for the horizon as a dashed line, one continuous y-scale, a vertical hairline at "Today" with an 11px label, a small marker + label "Mortgage paid off · 2044" at the payoff year, endpoint label with the year-N figure (13px). Axis: only the min/max y labels (11px muted) at left, and year labels every 5 years along the bottom. Draws in once (600ms). Inputs recompute it with a 300ms transition of the path (or just re-draw without animation, acceptable).
- Beneath: 11px muted `Illustrative · formula pending reconciliation (ticket 07)`.

## Narrow viewport (<720px)

- Top bar: keep wordmark, nav, and USD chip; hide the avatar and "Why this design".
- Header band stacks: Net Worth block, then distribution bars (name column 96px).
- Sheet table: hide the "in USD" and "Share" columns. Value cell 132px, as-of 64px.
- Check-in strip: hide the center help text; keep count and Leave.
- Drawer: full-screen as above.
- Content padding 20px 16px.

## Motion policy

Everything wrapped so `prefers-reduced-motion: reduce` disables transitions and animations (the tree-ui token block already has this rule; keep it). Nothing loops. Durations: indicator slide 200ms, drawer 220ms, cell settle 600ms, bars 400ms once, lines 600ms once, page switch fade+4px rise 180ms. No count-up numbers, no hover growth, no shadows.

## Keyboard

- Tab moves through value buttons, row-level actions and inputs normally.
- Value button: Enter/Space → edit. Editing: Enter commit, Esc cancel.
- Check-in: Enter / Shift+Enter / L / Esc as above. While in check-in, Tab should still work but is not required to stay inside the pass.
- Drawer: Esc closes; focus moves into the drawer on open and returns to the row on close.

## "Why this design" notes panel

Same slide-in panel as the drawer (reuse it), opened from the top-bar link. Plain prose, 13px, with these headings and 2–4 sentences each, written from this brief: *One page is the Portfolio* (why a balance sheet over a tree or tabs, given a monthly check-in plus several distribution-only visits a month and small data); *Check-in is a mode, not a page*; *Distribution on the first screen*; *Liabilities as their own group*; *Nothing colored red or green*; *Illustrative projection* (ticket 07 caveat).

## Quality bar

- Numbers: all money via `fmtMoney` (thousands separators, no decimals; crypto quantities keep decimals only in the hint). Tabular numerals everywhere.
- No console errors in Chrome. Test by opening the file directly and: editing a value, backdating, `use`, a full check-in, a stale check-in, opening both drawer kinds, following the link between the house and the mortgage, editing Amortization inputs, the Plan page inputs, and a 400px-wide window.
- Before finishing, syntax-check the script by extracting it and running `node --check` on it (write the extracted script to a temp file in the scratchpad, not the repo).
- Keep the file under ~2,500 lines. Comment the top of the file: `<!-- PROTOTYPE — throwaway. FinAsset 360 Balance Sheet shape. Not production code. Brief: BRIEF.md -->`.
