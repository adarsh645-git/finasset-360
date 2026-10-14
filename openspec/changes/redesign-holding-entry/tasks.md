# Tasks

## 1. Holding detail for a manually valued Holding, and the links that reach it

Blocked by: none
A User can open `/holdings/[id]` for any current Holding and see the breadcrumb, badges, kind tag, USD value, native line with the Stale cue, the three actions, and the stat cards (D10, D11). Overview's Equity and Needs updating rows link to it, the "+ Add" buttons appear, and the shared age cue exists (D12, D17, D18). Data comes from `npm run seed` until the modal lands.

- [ ] 1.1 Tests named HD-01, HD-02, HD-03, HD-04, HD-05, HD-06, HD-08, HD-09, HD-10, HD-11, HD-17, HD-22, HD-23, HE-26, HE-27 written and failing (red)
- [ ] 1.2 `links.ts` registers the `holding` family and sets `ADDING = true`. Overview Equity rows and Needs updating Holding rows link to `/holdings/[id]`, Liability rows stay plain text, and every "+ Add" points to `?modal=add-asset` on the current path (HD-22, HE-26, HE-27)
- [ ] 1.3 `buildHoldingDetail` returns `null` for archived, unknown or foreign ids, and the page calls `notFound()` (HD-01)
- [ ] 1.4 Header: breadcrumb crumbs through `hrefFor(assets)` / `hrefFor(assetClass(id))`, kind tag by class, Country and currency badges, USD value, and native line with FX "as of" (HD-02, HD-03, HD-04)
- [ ] 1.5 `ageCue` and `updatedCue` exist, and the native line ends with the Stale cue. `formatDay` and `formatDayMonth` are added to `src/lib/format/` without changing existing helpers (HD-05, HD-23)
- [ ] 1.6 Action targets: "Update value" / "Edit positions" and "Edit" point at the modal params, and the stats follow D11, with "—" / "Added Mon YYYY" for items under a year old and an empty "Your equity" slot (HD-06, HD-08…HD-11, HD-17)
- [ ] 1.7 Tests named HD-01, HD-02, HD-03, HD-04, HD-05, HD-06, HD-08, HD-09, HD-10, HD-11, HD-17, HD-22, HD-23, HE-26, HE-27 pass in CI suites; npm run spec:coverage passes
- [ ] 1.8 Checked by hand against the mockup's account detail at 2000px, 800px and 390px (header wrap, stat cards reflow)

## 2. Value over time and the Value log

Blocked by: 1
The detail page shows the Holding's USD value over time (history, then its Projection, trimmed by the projection toggle) and the Value log: every Valuation for manual Holdings, and monthly rows plus today for Stocks (D14).

- [ ] 2.1 Tests named HD-18, HD-19, HD-20, HD-21 written and failing (red)
- [ ] 2.2 Chart series come from calc history (month-ends plus today, from the first Valuation, each date's FX Rate) and the calc Projection, with the title and sub-title by Country, and an overridable `chart.series` (D19) (HD-18, HD-19)
- [ ] 2.3 The Value log lists rows newest first with "+amount · +%" change, "· added" on the oldest row, every Valuation for manual Holdings, and the last Valuation per earlier month plus today's current value for Stocks (HD-20, HD-21)
- [ ] 2.4 Tests named HD-18, HD-19, HD-20, HD-21 pass in CI suites; npm run spec:coverage passes
- [ ] 2.5 Checked by hand against the mockup's account detail chart and Value log at 2000px, 800px and 390px (chart phone rules, touch tooltip at 390px)

## 3. The modal frame, Update value and Delete

Blocked by: 1
The layout-level modal host opens from the URL as a dialog or a phone bottom sheet with a footer error line. Update value records today's Valuation even when unchanged, and the two-click Delete archives the Holding and unlinks its loans (D1, D2, D9, D15, D19).

- [ ] 3.1 Tests named HE-01, HE-02, HE-03, HE-22, HE-23, HD-07 written and failing (red)
- [ ] 3.2 `ModalHost` in the `(app)` layout resolves params through the mode table; titles and save labels follow HE-01; unregistered or archived targets render nothing; closing removes only the modal params (HE-01, HE-02, HE-03)
- [ ] 3.3 The dialog frame has title, ×, body, footer error line, Cancel and Save, plus the header toggle slot and footer slot for later changes. Esc and backdrop close it, focus is trapped, and Save is disabled while saving
- [ ] 3.4 Update value: one large pre-filled input, the "Was … · logged as today's value, ⟨date⟩" line, "Enter the current value", and a post on every save, including unchanged (HE-22, HE-23)
- [ ] 3.5 `ConfirmDeleteButton`: "Delete" → "Confirm delete", reset on leaving the page; the second click archives, then goes to `/` and refreshes (HD-07)
- [ ] 3.6 `ModalHost` passes through extra params (`pass`, `from`) and accepts externally registered mode rows (e.g. `pass-summary`). Forms take an optional after-save URL callback that defaults to closing, and an optional `confirmPrices` flag (off by default; the plain form never sends `confirm_prices`), checked by a mode-table and close-href test under HE-03
- [ ] 3.7 Tests named HE-01, HE-02, HE-03, HE-22, HE-23, HD-07 pass in CI suites; npm run spec:coverage passes
- [ ] 3.8 Checked by hand against the mockup's Update value modal at 2000px and 800px (dialog) and 390px (bottom sheet, 92vh, inner scroll, 16px input)

## 4. Add and edit a Holding of any class except Stocks

Blocked by: 3
A User can add a Real estate, Cash, Crypto, Metals or Vehicles & other Holding from any "+ Add" and land on its detail page, and edit it with class and Country left out (D3–D6, D8).

- [ ] 4.1 Tests named HE-04, HE-05, HE-06, HE-07, HE-08, HE-09, HE-10, HE-11, HE-12 written and failing (red)
- [ ] 4.2 The asset form: class chips, Name label and placeholder by class, Held in, Description, Property type + city, Quantity + unit, and Current value + Cost basis, with the defaults and kept fields across class switches (HE-04, HE-05, HE-06)
- [ ] 4.3 The edit form is pre-filled, with no class chips and no Held in (HE-07)
- [ ] 4.4 `validate` and `toRequest` give the mockup's messages and amount parsing, leave blank optional fields out, and send `POST /api/holdings` or `PATCH /api/holdings/[id]` (HE-08, HE-09, HE-10)
- [ ] 4.5 Success refreshes, and an add goes to `/holdings/⟨new id⟩`. A rejected save shows the route's sentence and keeps the form (HE-11, HE-12)
- [ ] 4.6 Tests named HE-04, HE-05, HE-06, HE-07, HE-08, HE-09, HE-10, HE-11, HE-12 pass in CI suites; npm run spec:coverage passes
- [ ] 4.7 Checked by hand against the mockup's add/edit modal for each class at 2000px, 800px and 390px

## 5. Stocks accounts: the positions editor and Hand Prices

Blocked by: 4
A User can add a Stocks Holding, with each Position previewed from the ticker lookup, `.NS` for India, and the Hand Price path for tickers without market data. Edit positions updates a Hand Price by re-typing its ticker; only a changed price is re-dated (D7, D8, D9).

- [ ] 5.1 Tests named HE-13, HE-14, HE-15, HE-16, HE-17, HE-18, HE-19, HE-20, HE-21, HE-24, HE-25 written and failing (red)
- [ ] 5.2 `positionsReducer` with the ticker key rule, the debounced lookup applied only for the current key, and the preview copy (HE-13, HE-14)
- [ ] 5.3 The unknown-ticker path: price, Sector (default Other) and name pre-filled from the lookup (HE-15)
- [ ] 5.4 Add (button or Enter) checks in order, defaults avg cost to the price, replaces a same-ticker row and clears the entry row. Re-typing a listed ticker pre-fills it (HE-16…HE-19)
- [ ] 5.5 Rows, ×, the running native total, and the "· price N days old" cue (HE-20, HE-21)
- [ ] 5.6 Stocks create and Edit positions send the full Positions list, with Hand Price, Sector and name only for tickers without market data. Save is blocked with "Add ⟨ticker⟩ or clear it first" while a ticker is typed but not added (HE-24, HE-25, HE-08)
- [ ] 5.7 Tests named HE-13, HE-14, HE-15, HE-16, HE-17, HE-18, HE-19, HE-20, HE-21, HE-24, HE-25 pass in CI suites; npm run spec:coverage passes
- [ ] 5.8 Checked by hand against the mockup's Stocks modal at 2000px, 800px and 390px (Enter adds, preview while typing, entry row fits on phone)

## 6. Stocks detail: Positions in this account and By sector

Blocked by: 1
A Stocks Holding's page shows its Cost Basis and gain from Positions, its Positions sorted by value with weight and gain, By sector, and the price age cue on stale hand-priced rows. Each row links to the drawer param (D13).

- [ ] 6.1 Tests named HD-12, HD-13, HD-14, HD-15, HD-16 written and failing (red)
- [ ] 6.2 Cost basis and Unrealized gain from Positions (HD-12)
- [ ] 6.3 Positions rows (ticker without suffix, Sector dot, "N sh · name", price, value, gain %, weight) sorted by value, and By sector with tickers and one-decimal shares, side by side in the `@container` two-column class (HD-13, HD-14)
- [ ] 6.4 Rows link to `?position=<holdingId>~<ticker>`, and stale hand-priced rows end "· price N days old" (HD-15, HD-16)
- [ ] 6.5 Tests named HD-12, HD-13, HD-14, HD-15, HD-16 pass in CI suites; npm run spec:coverage passes
- [ ] 6.6 Checked by hand against the mockup's brokerage detail at 2000px, 800px (stacked below 820px of content) and 390px (dropped columns)

## 7. The position drawer

Blocked by: 6
Any page whose URL carries `?position=` opens the drawer for that Position: identity, USD value and native line, six stats with the Hand Price date, the Yahoo Finance link rule and "View ⟨account⟩" (D16).

- [ ] 7.1 Tests named PD-01, PD-02, PD-03, PD-04, PD-05, PD-06, PD-07 written and failing (red)
- [ ] 7.2 `DrawerHost` in the `(app)` layout resolves the param among current Stocks Holdings, and closing removes only `position` (PD-01, PD-02)
- [ ] 7.3 `buildPositionDrawer`: ticker, exchange, name, Sector and account, USD value and native line, and the six stats with "Market price" or "as of D Mon" (PD-03, PD-04, PD-05)
- [ ] 7.4 "Open on Yahoo Finance ↗" only for market data or `.NS`/`.BO`, in a new tab, plus "View ⟨account⟩" (PD-06, PD-07)
- [ ] 7.5 Tests named PD-01, PD-02, PD-03, PD-04, PD-05, PD-06, PD-07 pass in CI suites; npm run spec:coverage passes
- [ ] 7.6 Checked by hand against the mockup's position drawer at 2000px and 800px (400px panel) and 390px (full width)

## Workflow follow-up

- Run `/opsx:verify redesign-holding-entry` once every ticket is done, then open the PR.
- The user runs `/opsx:archive` after merge.
