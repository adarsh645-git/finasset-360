# Proposal

## Why

The mockup redesign ([map #13](https://github.com/adarsh645-git/finasset-360/issues/13)) moves every Projection setting onto the Growth page and makes it the one place to see how Net Worth got here and where it is heading. After `redesign-update-pass` the User can record and update everything, but cannot change a growth rate, inflation, Monthly savings or the horizon. Every Projection, and every Goal date later, runs on defaults until this change ships. It is change 8 of the [nine-change sequence](https://github.com/adarsh645-git/finasset-360/issues/16).

## What Changes

- **`/growth` page** (new route; mockup screen 8):
  - **Header:** the Net Worth change over the chosen range and **Country scope**, with "Net worth change since ⟨Mon YYYY⟩ · ⟨scope⟩ · $A → $B". The controls are All | United States | India, the range (1Y / 3Y / 5Y / All), and the shared projection toggle.
  - **Chart card:** the title sits on its own row, with the controls on the row below. The modes are **Simple**, **By asset class** and **By country**. There is a **Nominal | Today's dollars** switch, and the subtitle names each in-scope Country's inflation. Key lines get right-edge value labels, and the legend sits below the chart. With the projection on, the chart runs to the end of the User's horizon.
  - **Where the change came from:** waterfall rows for the start, asset growth & savings, debt paid down, "Currency (₹ → $)" (only when India is in scope) and today. The rows come from the calculations module's change attribution and sum exactly to the header's change.
  - **Year by year:** Net Worth, debt and % change at each year end, newest first, with the current year starred and shown at today.
  - **Empty state:** with no Holdings and no Liabilities, the page shows one card with a link to add an account or asset. The Projection assumptions card stays editable.
- **Projection assumptions card** (the only editor for Projection Assumptions):
  - A United States | India tab with Inflation, Real estate, Stocks and Cash (%/yr), each with an "amount held" hint, plus **Monthly savings** in that Country's currency.
  - "Shared across countries": Crypto, Metals, Vehicles & other, and one **Savings growth %/yr**.
  - A blank field means the default, which is shown as the placeholder.
  - The **horizon** input (whole years 1–40, default 10) sits in the card header next to **Reset defaults**, which blanks every field.
  - Rates are validated from −50 to 50, and Monthly savings must be 0 or more. Each valid edit is saved as soon as the field is committed, through `redesign-data-model`'s `PATCH /api/projection-assumptions`, and every chart and figure then recomputes.
  - **Footer:** Net Worth by the horizon's end month (nominal), the same in Today's dollars, and the amount lost to inflation, for the current Country scope.
- **Incoming links turned on:** adding the `growth` route family to the shell's link registry makes the Growth nav item (sidebar, tablet tabs, phone tab bar) and the Overview "Equity built" stat card go to `/growth`.
- **Horizon everywhere:** the shell already labels the projection toggle "N-yr projection on" from the User's horizon, and every chart already projects over it. This change is the first that lets the User set the horizon, so a saved 15 reads "15-yr projection on" everywhere.
- **Responsive behaviour** ships here, as for every page change: the waterfall and Year by year use the shell's two-column class (stacking below 820px of content width), and controls are 40px touch targets on phones. The user checks it by hand at about 2000px, 800px and 390px.

### Non-goals

- Any new calculation. The Projection, Today's dollars, change attribution and history all come from `redesign-calculations`, and nothing here reimplements their math.
- Schema, route or validation changes. The settings route and its rules belong to `redesign-data-model`; this change only calls them.
- Goal lines on the Growth chart, the Goals page, and the savings-aware Goals subtitle (all `redesign-goals`).
- An FX depreciation assumption, per-Holding rates, Countries beyond US and India, and a Year by year that extends into the Projection.
- Storing view state (range, Country scope, mode, basis) per User. It lives in the URL.

## Capabilities

### New Capabilities

- `growth-page`: the `/growth` screen. Its header and controls, the chart modes with Nominal and Today's dollars, the "Where the change came from" waterfall, Year by year, the empty state, and the incoming Growth nav and Equity built links.
- `projection-assumptions-editor`: viewing and editing Projection Assumptions, Monthly savings, savings growth and the horizon on the Growth page. Covers placeholders and amount-held hints, validation, live saving, Reset defaults, the end-of-horizon footer, and the horizon's reach into every chart and the projection toggle label.

### Modified Capabilities

None (`openspec/specs/` is empty; earlier `redesign-*` changes add their capabilities as ADDED too).

## Impact

- **Code:** a new `(app)/growth` page (Server Component using the shell's request-cached `getPortfolio()`), view-models `src/lib/views/growth.ts` and `src/lib/views/projection-assumptions.ts`, and one client component for the assumptions card. View state is in search params: `?range=` (the shell's convention), `?scope=`, `?mode=`, `?basis=` and `?tab=`. It consumes `src/lib/calc/` (Projection, history, Today's dollars, attribution, shared defaults), `PortfolioData`'s Country defaults, `src/lib/format/`, the chart primitive, the projection toggle context, the two-column class and `PATCH /api/projection-assumptions`. The one edit outside its own files: `growth` joins `EXISTING_ROUTES` in `src/lib/views/links.ts`.
- **Tests:** Vitest view-model tests in `tests/unit/` named by scenario ID (GR, PA), plus `renderToStaticMarkup` tests for the empty state and links. There are no new route tests: data-model's route tests already cover the settings route.
- **Dependencies:** none added. No migration, so no production `db push`.
- **Docs:** no CONTEXT.md or ADR edits. A proposed glossary entry, **Country scope** (the All | United States | India view filter), is left to the main session.
