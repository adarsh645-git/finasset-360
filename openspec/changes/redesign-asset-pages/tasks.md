# Tasks

## 1. Assets page grouped by class, with links on

Blocked by: none
`/assets` lists every current Holding grouped by Asset Class, with the header, collapsible groups, one-line rows that open Holding detail, "+ Add asset" and the empty state. The `assets` route family joins the link registry, which turns on the Assets nav item and the Total assets stat card (D1, D3, D6, D7, D12, D14).

- [x] 1.1 Tests named AS-01, AS-02, AS-03, AS-04, AS-05, AS-06, AS-07, AS-08, AS-13, AS-17, AS-18, AS-19, AS-20 written and failing (red)
- [x] 1.2 The shared row builder gives the subtitle, Country badge, native, USD, gain and stale cue for each kind of Holding, and archived Holdings never appear (AS-05, AS-06, AS-07, AS-08)
- [x] 1.3 The header shows the total, the counts and the set 12-month change, or "—" (AS-01, AS-02)
- [x] 1.4 Class groups follow the fixed order, with noun counts, shares of total assets, rows by value, and Collapse/Expand all (AS-03, AS-04, AS-13)
- [x] 1.5 With no Holdings, the page shows "No accounts or assets yet", and both Add buttons open the add-asset modal (AS-17, AS-18)
- [x] 1.6 `assets` is in `EXISTING_ROUTES`. The Assets nav item is a link and active on `/assets`, `/assets/*` and `/holdings/*`, and the Total assets card links to `/assets` (AS-19, AS-20)
- [x] 1.7 Tests named AS-01, AS-02, AS-03, AS-04, AS-05, AS-06, AS-07, AS-08, AS-13, AS-17, AS-18, AS-19, AS-20 pass in CI suites; npm run spec:coverage passes
- [ ] 1.8 Checked by hand against the mockup's Assets screen at 2000px, 800px and 390px (phone rows show name and USD only)

## 2. Assets page: tiles, Group by Country | None, search

Blocked by: 1
The class tiles filter the list, and selecting the selected tile again clears it. Group by Country and None work. Search matches name, Description, city, tickers and company names, opens collapsed groups, and shows "No holdings match." when nothing is left (D4, D5).

- [x] 2.1 Tests named AS-09, AS-10, AS-11, AS-12, AS-14, AS-15, AS-16 written and failing (red)
- [x] 2.2 Tiles show "All assets" plus one per class in use, and filtering keeps group shares relative to total assets (AS-09, AS-10)
- [x] 2.3 Country groups count in items and badge the Asset Class. None shows one "All holdings" group (AS-11, AS-12)
- [x] 2.4 Search combines with the filter, ignores case and spaces, opens every group, and shows "No holdings match." (AS-14, AS-15, AS-16)
- [x] 2.5 Tests named AS-09, AS-10, AS-11, AS-12, AS-14, AS-15, AS-16 pass in CI suites; npm run spec:coverage passes
- [ ] 2.6 Checked by hand against the mockup's Assets screen at 2000px, 800px and 390px (tiles reflow, search field and Group by fit on phone)

## 3. Class pages with chart and Holdings table, with links on

Blocked by: 1
`/assets/[class]` for the six Asset Classes. Each page has the breadcrumb, a header with total, 12-month change, share and projected rate(s), the projection toggle, "+ Add to ⟨class⟩", the class chart, the Holdings table and the empty state. Unknown slugs are a 404. The `assetClass` route family joins the registry, which turns on the sidebar class rows, the Allocation rows and the Holding detail breadcrumb (D2, D6, D11, D12, D13, D14).

- [ ] 3.1 Tests named AC-01, AC-02, AC-03, AC-04, AC-05, AC-06, AC-07, AC-08, AC-19, AC-20, AC-21, AC-22 written and failing (red)
- [ ] 3.2 The six slugs render and any other is not found (AC-01)
- [ ] 3.3 The header gives the total, the set 12-month change or "—", the share of total assets, and the resolved rate per Country or shared (AC-02, AC-03, AC-04)
- [ ] 3.4 "+ Add to ⟨class⟩" and the empty state's Add open the add-asset modal with the class preselected. An empty class shows "No ⟨plural noun⟩ in ⟨class⟩ yet" and no chart (AC-05, AC-08)
- [ ] 3.5 The chart runs from the class's first Valuation to today, then over the horizon from the class Projection (AC-06)
- [ ] 3.6 The Holdings table lists only this class, largest first, with rows from the shared builder (AC-07)
- [ ] 3.7 `assetClass` is in `EXISTING_ROUTES`. Sidebar class rows link and show selected, Allocation rows link, and Holding detail's "Assets" and class crumbs link (AC-19, AC-20, AC-21)
- [ ] 3.8 Holding detail's Delete, once confirmed, archives and goes to the Holding's class page instead of the Overview, through the after-archive target of holding-entry's `ConfirmDeleteButton` (AC-22)
- [ ] 3.9 Tests named AC-01, AC-02, AC-03, AC-04, AC-05, AC-06, AC-07, AC-08, AC-19, AC-20, AC-21, AC-22 pass in CI suites; npm run spec:coverage passes
- [ ] 3.10 Checked by hand against the mockup's Cash and Crypto class screens at 2000px, 800px and 390px (chart phone rules, table drops Where, Native and Gain on phone)

## 4. Stocks Positions card

Blocked by: 3
The Stocks page shows the Positions card. By sector has the distribution bar, aligned columns, collapsible sector rows and Expand/Collapse all. All positions is the flat table with ticker, exchange, name · account, Sector, shares, price, value, gain and weight. Unknown tickers fall back as in D8, and every Position row opens the position drawer (D8, D9).

- [ ] 4.1 Tests named AC-09, AC-10, AC-11, AC-12, AC-13, AC-14, AC-15, AC-16, AC-17 written and failing (red)
- [ ] 4.2 Only the Stocks page renders the Positions card (AC-09, Stocks and other-class rows)
- [ ] 4.3 Sector rows, the distribution bar and the card subtitle match the sums, shares and gains, and the phone subtitle leads with "% of stocks" (AC-10, AC-12, AC-13)
- [ ] 4.4 Sectors start collapsed, and Expand all / Collapse all toggle them all (AC-11)
- [ ] 4.5 All positions lists each Position once per Holding, with the suffix stripped, the exchange fallback, the name, Sector and Hand Price fallbacks, and the price age cue (AC-14, AC-15, AC-16)
- [ ] 4.6 Position rows in both views target `?position=<holdingId>~<ticker>`, and the drawer opens over the Stocks page (AC-17)
- [ ] 4.7 Tests named AC-09, AC-10, AC-11, AC-12, AC-13, AC-14, AC-15, AC-16, AC-17 pass in CI suites; npm run spec:coverage passes
- [ ] 4.8 Checked by hand against the mockup's Stocks class screen at 2000px, 800px and 390px (columns align between sector and stock rows; phone drops shares, gain and weight)

## 5. Real estate distribution cards

Blocked by: 3
The Real estate page shows By property type and By location, each with a stacked bar and rows of label, Holding names, value and share. Holdings with no city group as "Not set" (D10).

- [ ] 5.1 Tests named AC-18 written and failing (red), and AC-09's Real estate row added to its test
- [ ] 5.2 Property type and location rows sort by value with one-decimal shares, and an empty city groups as "Not set" (AC-18)
- [ ] 5.3 Only the Real estate page renders the two cards (AC-09)
- [ ] 5.4 Tests named AC-09, AC-18 pass in CI suites; npm run spec:coverage passes
- [ ] 5.5 Checked by hand against the mockup's Real estate class screen at 2000px, 800px and 390px (the two cards sit side by side wide and stack narrow)

## Workflow follow-up

- Run `/opsx:verify redesign-asset-pages` once every ticket is done, then open the PR.
- The user runs `/opsx:archive` after merge.
