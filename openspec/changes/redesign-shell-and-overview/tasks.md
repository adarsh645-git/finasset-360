# Tasks

## 1. Formatting helpers

Blocked by: none
Every amount, percentage, date, duration and age the redesign shows can be written one way, from one module that later changes reuse: whole-dollar USD, en-IN rupees, compact and signed amounts, shares that are 0% of a $0 total, and "—" for absent figures (D15).

- [x] 1.1 Tests named FM-01, FM-02, FM-03, FM-04, FM-05, FM-06, FM-07, FM-08, FM-09, FM-10 written and failing (red)
- [x] 1.2 USD, rupee and native amounts round to whole units, use U+2212 for minus and never print −$0 (FM-01, FM-02, FM-03)
- [x] 1.3 Compact thresholds match the prototype's `cmp()`; signed forms show + for zero; a share of a $0 total is 0% (FM-04, FM-05, FM-06)
- [x] 1.4 Every helper turns an absent figure into — (FM-07); months, durations and ages have their fixed shapes (FM-08, FM-09, FM-10)
- [x] 1.5 Tests named FM-01, FM-02, FM-03, FM-04, FM-05, FM-06, FM-07, FM-08, FM-09, FM-10 pass in CI suites; npm run spec:coverage passes

## 2. Tokens, theme and the shell frame

Blocked by: none
A signed-in User sees the new frame around the existing interim page. It is in the mockup's tokens, with a light/dark toggle remembered in a cookie and never flashed. The nav takes three forms (sidebar ≥1024px, top bar + scrolling tabs 640–1023px, top bar + bottom tab bar <640px), with the five items (only Overview a link), the active item, the first name and Sign out, the 820px container rule and 40px touch targets (D1–D5, D9, D11, D12).

- [x] 2.1 Tests named TH-01, TH-02, TH-03, SH-01, SH-02, SH-03, SH-10 written and failing (red)
- [x] 2.2 `globals.css` holds the README tokens for light and dark, the class and Country colours, radii and type, mapped through `@theme inline`, with the `dark:` variant on `data-theme`; Geist replaces Arial (TH-03)
- [x] 2.3 The root layout reads the `theme` cookie into `data-theme` on `<html>`; the toggle flips it at once and writes the cookie for a year (TH-01, TH-02)
- [x] 2.4 The `(app)` route group's layout guards the session and renders the three nav forms from one `buildShell()` result, with the active item from the path; the interim page moves inside it as `/` (SH-01, SH-02, SH-03)
- [x] 2.5 `links.ts` holds the route registry with only `overview` on and the `ADDING` flag off; the sign-in chrome sits in the sidebar footer and the top bar (SH-10)
- [x] 2.6 Tests named TH-01, TH-02, TH-03, SH-01, SH-02, SH-03, SH-10 pass in CI suites; npm run spec:coverage passes
- [ ] 2.7 Checked by hand against the mockup's shell at 2000px, 800px and 390px: sidebar, scrolling tabs, bottom tab bar with safe-area spacing, 40px targets, and no theme flash on reload in either theme

## 3. Shell totals from the Portfolio

Blocked by: 1, 2
The shell shows the User's real numbers from the read model: Net Worth with its 12-month change ("—" without a year of history), compact Assets and Liabilities totals in every nav form, and the "Asset classes" list of classes in use with colour dots, all plain text until their pages exist. An empty Portfolio shows $0 and "—" (D13).

- [ ] 3.1 Tests named SH-04, SH-05, SH-06, SH-07, SH-08, SH-09, SH-11 written and failing (red)
- [ ] 3.2 A request-scoped `getPortfolio()` wraps `loadPortfolio` in `cache()`, and the layout passes its data to `buildShell()`
- [ ] 3.3 Net Worth, its 12-month change and the nav totals come from `calc/`, excluding archived items (SH-04, SH-05, SH-06)
- [ ] 3.4 The class list shows only classes with current Holdings, in the fixed order; every row and item takes its `href` from the registry (SH-07, SH-08, SH-09)
- [ ] 3.5 With no current items the sidebar shows $0, — and no class heading (SH-11)
- [ ] 3.6 Tests named SH-04, SH-05, SH-06, SH-07, SH-08, SH-09, SH-11 pass in CI suites; npm run spec:coverage passes
- [ ] 3.7 Checked by hand with `npm run seed` data and with an empty User against the mockup's sidebar at 2000px, and the tab bar totals at 390px

## 4. Shared chart primitive

Blocked by: 1
One SVG chart that later pages only pass series to: nice ticks, lines, areas and stacked bases, the dashed projection with its shaded region and "Today → projected" marker, goal lines, a forced $0 on the axis, per-series tooltip values for stacked layers, x labels by span, non-overlapping end labels, crosshair tooltip with "· projected", tap/drag touch that clears after ~1.8s with `pan-y` scrolling, the phone rules in CSS, a legend slot, and the shared projection toggle with its cookie (D6–D8).

- [ ] 4.1 Tests named CH-01, CH-02, CH-03, CH-04, CH-05, CH-06, CH-07, CH-08, CH-09, CH-10, CH-11, CH-12, CH-13, CH-14, CH-15, CH-16 written and failing (red)
- [ ] 4.2 `src/lib/chart/` computes the y-domain, ticks, time x-scale, paths split at today, stacked areas, goal filtering, forced zero, per-series tooltip values, x labels, end-label spacing and the nearest point, with no DOM (CH-01 … CH-12, CH-15, CH-16)
- [ ] 4.3 `src/components/chart/` renders the geometry with the crosshair, dots, tooltip, touch clear-out and phone CSS (CH-13, CH-14)
- [ ] 4.4 The `projection` cookie seeds a shared provider in the `(app)` layout; the toggle flips every chart at once and is remembered (CH-07)
- [ ] 4.5 Tests named CH-01, CH-02, CH-03, CH-04, CH-05, CH-06, CH-07, CH-08, CH-09, CH-10, CH-11, CH-12, CH-13, CH-14, CH-15, CH-16 pass in CI suites; npm run spec:coverage passes

## 5. Overview header, Net Worth chart and first run

Blocked by: 3, 4
The Overview replaces the interim page. It has the Net Worth header with its change since the range start, the 1Y/3Y/5Y/All range in the address, the projection toggle, and the Net Worth chart with Assets and Liabilities in the tooltip. An empty Portfolio shows only the $0 header and the "Add your first account or asset" card (D10, D14).

- [ ] 5.1 Tests named OV-01, OV-02, OV-03, OV-04, OV-05, OV-21, OV-22 written and failing (red)
- [ ] 5.2 `buildOverview()` returns the header from `calc/` history with the range start clamped to the earliest Valuation, and the percent only from a start above 0 (OV-01, OV-02, OV-03)
- [ ] 5.3 The range is read from `?range=`, with All by default and for unknown values; segments are replace-links (OV-04)
- [ ] 5.4 The chart gets history plus the Projection over the horizon, Net worth drawn, and Assets and Liabilities as tooltip-only series (OV-05)
- [ ] 5.5 First run: no current items gives the $0 header and the card, with no chart, controls or cards, and no Add button while `ADDING` is off (OV-21, OV-22)
- [ ] 5.6 Tests named OV-01, OV-02, OV-03, OV-04, OV-05, OV-21, OV-22 pass in CI suites; npm run spec:coverage passes
- [ ] 5.7 Checked by hand against the mockup's Overview header and chart at 2000px, 800px and 390px (hover at 2000px, tap and drag at 390px, projection on and off), and the first-run state at 2000px and 390px

## 6. Stat cards, Allocation, Where it's held and Currency effect

Blocked by: 5
Below the chart, the User sees Total assets, Liabilities (paid down in 12 mo) and Equity built, the Allocation bar and rows of classes in use, "Where it's held" for the Countries in use, and the 12-month Currency effect line when there are India items. Everything is plain text until its target page exists (D14, D16).

- [ ] 6.1 Tests named OV-06, OV-07, OV-08, OV-09, OV-10, OV-13, OV-14, OV-15, OV-16 written and failing (red)
- [ ] 6.2 Stat cards use the set 12-month rule, with — when absent and the empty-state wording (OV-06, OV-07, OV-08)
- [ ] 6.3 Allocation lists classes with current Holdings, largest first, with 0% shares of a $0 total and the 12-month column dropped on phones (OV-09, OV-10)
- [ ] 6.4 Where it's held shows only Countries in use (OV-13)
- [ ] 6.5 The Currency effect comes from `calc/` attribution over 12 months, shows the FX as-of date when stale, and is absent without India items (OV-14, OV-15, OV-16)
- [ ] 6.6 Tests named OV-06, OV-07, OV-08, OV-09, OV-10, OV-13, OV-14, OV-15, OV-16 pass in CI suites; npm run spec:coverage passes
- [ ] 6.7 Checked by hand against the mockup's Overview cards at 2000px, 800px and 390px

## 7. Equity in financed assets, Needs updating and the Goals slot

Blocked by: 6
The left column gains the Equity card per linked pair (hidden with none). The right column gains the Needs updating card, shown only when something is Stale, listing it oldest first with "N days old", plus the empty slot `redesign-goals` will fill. The two columns stack when the content is under 820px (D5, D14).

- [ ] 7.1 Tests named OV-11, OV-12, OV-17, OV-18, OV-19, OV-20, OV-23 written and failing (red)
- [ ] 7.2 Equity rows come from `calc/` Equity and % owned for current pairs, and the card is absent with none (OV-11, OV-12)
- [ ] 7.3 Needs updating uses `calc/` staleness over current Holdings and Liabilities, sorted by age then name, with Stocks rows reading "prices N days old", and is absent when nothing is Stale (OV-17, OV-18)
- [ ] 7.4 The ordered Stale list is exported on its own as `buildStaleList()` from `src/lib/views/stale-list.ts`, `buildOverview` uses it, and the card header has an empty trailing action slot for update-pass (OV-17)
- [ ] 7.5 Rows take Holding or Liability detail links from the registry, plain text while those routes don't exist (OV-19)
- [ ] 7.6 The right column ends with an empty Goals slot, and the cards stack in the order Allocation, Equity, Where it's held, Needs updating (OV-20, OV-23)
- [ ] 7.7 Tests named OV-11, OV-12, OV-17, OV-18, OV-19, OV-20, OV-23 pass in CI suites; npm run spec:coverage passes
- [ ] 7.8 Checked by hand against the mockup's Overview at 2000px, 1100px and 800px (stacking around 820px of content) and 390px, with seed data that has linked loans and Stale items

## Workflow follow-up

- Run `/opsx:verify redesign-shell-and-overview` once every ticket is done, then open the PR.
- The user runs `/opsx:archive` after merge.
