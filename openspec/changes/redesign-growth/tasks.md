# Tasks

## 1. Growth page with its header, Simple chart and incoming links

Blocked by: none
`/growth` exists. It shows the nominal Net Worth change for the range and Country scope, the controls (All | United States | India, range, projection toggle), and the chart card in Simple mode through the end of the horizon, with end labels and the legend below. An empty Portfolio gets the add link instead. The Growth nav item and the Equity built card now lead here (D1, D2, D3, D12, D13).

- [ ] 1.1 Tests named GR-01, GR-02, GR-03, GR-04, GR-05, GR-16, GR-18, GR-19 written and failing (red)
- [ ] 1.2 `growth` joins `EXISTING_ROUTES`, so the Growth nav item (all three nav forms) and the Equity built card link to `/growth` (GR-18, GR-19)
- [ ] 1.3 `buildGrowth` reads range, scope, mode and basis from search params with defaults for missing or unknown values (GR-01)
- [ ] 1.4 The header shows the scoped nominal change and "Net worth change since ⟨Mon YYYY⟩ · ⟨scope⟩ · $A → $B", with the start clamped to the earliest Valuation (GR-02, GR-03)
- [ ] 1.5 The Simple chart has Net worth, Assets and Owed from the range start to the horizon's end, with `zero: true`, end labels and the legend below. The projection toggle trims the projected part (GR-04, GR-05)
- [ ] 1.6 With no current Holdings or Liabilities, the page shows only the "Add an account or asset" card, with no controls, chart, waterfall or Year by year (GR-16)
- [ ] 1.7 Tests named GR-01, GR-02, GR-03, GR-04, GR-05, GR-16, GR-18, GR-19 pass in CI suites; npm run spec:coverage passes
- [ ] 1.8 Checked by hand against the mockup's Growth header and chart card at 2000px, 800px and 390px

## 2. Chart modes and Today's dollars

Blocked by: 1
The chart switches between Simple, By asset class and By country, and between Nominal and Today's dollars. The title and subtitle name the basis, the scope and each in-scope Country's inflation (D3).

- [ ] 2.1 Tests named GR-06, GR-07, GR-08, GR-09, GR-10 written and failing (red)
- [ ] 2.2 By asset class stacks the classes with value anywhere in the window, largest at the bottom, each with its own values as `tip`, then Owed and Net worth. Savings appear as a Stocks layer (GR-06, GR-07)
- [ ] 2.3 By country draws each in-scope Country's Net Worth line, plus Total when both are in scope (GR-08)
- [ ] 2.4 Today's dollars restates every series per Country through the calculations module, with the title and subtitle per basis and scope (GR-09, GR-10)
- [ ] 2.5 Tests named GR-06, GR-07, GR-08, GR-09, GR-10 pass in CI suites; npm run spec:coverage passes
- [ ] 2.6 Checked by hand against the mockup's Growth chart in all three modes and both bases at 2000px, 800px and 390px

## 3. Where the change came from

Blocked by: 1
The waterfall card splits the header's change into asset growth & savings, debt paid down and (with India in scope) the Currency effect, from the calculations module's attribution, with bars on one shared scale (D4).

- [ ] 3.1 Tests named GR-11, GR-12, GR-13 written and failing (red)
- [ ] 3.2 Rows per scope, with the Currency row only when India is in scope, sum exactly to the header's change (GR-11)
- [ ] 3.3 The subtitle names the exchange-rate month and a single scope (GR-12)
- [ ] 3.4 Bars span their running totals on a scale that includes 0, coloured by kind and sign (GR-13)
- [ ] 3.5 Tests named GR-11, GR-12, GR-13 pass in CI suites; npm run spec:coverage passes
- [ ] 3.6 Checked by hand against the mockup's "Where the change came from" card at 2000px, 800px and 390px

## 4. Year by year

Blocked by: 1, 3
The Year by year card lists Net Worth, debt and % change at each year end from the first Valuation's year, newest first, with the current year starred at today. It sits beside the waterfall in the shell's two-column row (D5, D15).

- [ ] 4.1 Tests named GR-14, GR-15, GR-17 written and failing (red)
- [ ] 4.2 Rows use year-end values at each date's FX Rate, the current year at today, and "—" for the first year or a previous 0 (GR-14)
- [ ] 4.3 Rows follow the scope and ignore the range and the basis (GR-15)
- [ ] 4.4 A brand-new item gives a one-point history, zero waterfall steps and a single "2026*" row (GR-17)
- [ ] 4.5 Tests named GR-14, GR-15, GR-17 pass in CI suites; npm run spec:coverage passes
- [ ] 4.6 Checked by hand against the mockup's Year by year card and two-column stacking around 820px of content, at 2000px, 800px and 390px

## 5. Projection assumptions card: rates and Monthly savings, saved live

Blocked by: 1
The Projection assumptions card shows the US/India tab (Inflation, Real estate, Stocks, Cash, Monthly savings) and the shared section (Crypto, Metals, Vehicles & other, Savings growth), with saved values, default placeholders and amount-held hints. Each valid edit is saved on commit through `PATCH /api/projection-assumptions`, and the page recomputes (D6, D7, D8, D14).

- [ ] 5.1 Tests named PA-01, PA-02, PA-03, PA-04, PA-05, PA-07, PA-08, PA-09, PA-10 written and failing (red)
- [ ] 5.2 `buildAssumptions` returns each field's value, placeholder and hint, with the tab from the URL or the scope (PA-01, PA-02, PA-03); the scope links carry the tab (PA-04)
- [ ] 5.3 `parseField` validates rates and Monthly savings with the route's ranges and messages (PA-05, PA-07)
- [ ] 5.4 `planSave` saves only a changed, valid field as a one-field patch, blank as null, and nothing otherwise. The card sends it on blur or Enter, refreshes, and shows a failed save inline (PA-08, PA-09, PA-10)
- [ ] 5.5 The card is shown and editable on the empty Growth page too
- [ ] 5.6 Tests named PA-01, PA-02, PA-03, PA-04, PA-05, PA-07, PA-08, PA-09, PA-10 pass in CI suites; npm run spec:coverage passes
- [ ] 5.7 Checked by hand against the mockup's Projection assumptions card (typing, blur, Enter, the chart updating after a save) at 2000px, 800px and 390px

## 6. Horizon, Reset defaults and the end-of-horizon footer

Blocked by: 5
The horizon input sits in the card header beside Reset defaults, which blanks every field in one request. The footer shows Net Worth by the horizon's end month, nominal and in Today's dollars, and the amount lost to inflation, for the scope. A saved horizon relabels the projection toggle everywhere (D9, D10, D11).

- [ ] 6.1 Tests named PA-06, PA-11, PA-12, PA-13, PA-14 written and failing (red)
- [ ] 6.2 The horizon field validates whole years from 1 to 40 and saves through the same plan (PA-06)
- [ ] 6.3 Reset defaults saves every field as blank in one request (PA-11)
- [ ] 6.4 The footer per scope, including Monthly savings with nothing held (PA-12, PA-13)
- [ ] 6.5 A horizon of 15 gives "15-yr projection on" and "Net worth by Oct 2041" (PA-14)
- [ ] 6.6 Tests named PA-06, PA-11, PA-12, PA-13, PA-14 pass in CI suites; npm run spec:coverage passes
- [ ] 6.7 Checked by hand against the mockup's card header and footer at 2000px, 800px and 390px, and the toggle label on Overview after changing the horizon

## Workflow follow-up

- Run `/opsx:verify redesign-growth` once every ticket is done, then open the PR.
- The user runs `/opsx:archive` after merge.
