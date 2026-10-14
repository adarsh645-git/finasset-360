# Proposal

## Why

After `redesign-data-model` and `redesign-shell-and-overview`, production shows an Overview of real data, but a User has no way to add or change what they own. The seed script is the only way data gets in. This change adds the mockup's add/edit modal, Holding detail page and position drawer. It is the fourth change in the [nine-change sequence](https://github.com/adarsh645-git/finasset-360/issues/16), and from here **the app is usable again**.

## What Changes

- **The add/edit modal**, shared by every later change:
  - Its state lives in search params (`?modal=add-asset[&class=…]`, `?modal=edit&holding=…`, `?modal=update&holding=…`), so Back closes it.
  - It is a dialog on desktop and tablet and a bottom sheet on phone, with validation messages in one footer line.
  - `redesign-liabilities` adds the loan form to it and `redesign-update-pass` adds the guided pass.
- **The asset side of the modal** ([#1](https://github.com/adarsh645-git/finasset-360/issues/1), [#2](https://github.com/adarsh645-git/finasset-360/issues/2)):
  - Asset Class chips, then a Name whose label and placeholder follow the class, "Held in" (United States · $ / India · ₹), and an optional Description. The edit form leaves out the class chips and "Held in", because a Holding's class and Country are fixed after creation (archive and re-add instead).
  - Real estate adds Property type chips and a city. Metals adds an optional quantity with a Grams / Troy oz unit.
  - Every class except Stocks has a current value and an optional Cost Basis.
- **The Stocks positions editor** ([#1](https://github.com/adarsh645-git/finasset-360/issues/1), [#12](https://github.com/adarsh645-git/finasset-360/issues/12)):
  - Each row is Ticker / Shares / Avg cost / Add, and Enter adds the row.
  - The ticker lookup previews "name · Sector · price · exchange". An India account appends `.NS` to the ticker.
  - A ticker with no market data takes a Hand Price, a Sector and a name. For `.NS` tickers the name is pre-filled from the lookup.
  - Re-typing a ticker already in the account pre-fills its saved figures. Rows can be removed, and a running total shows. Each ticker appears at most once.
- **Update value** (one large input; "Was … · logged as today's value", and an unchanged value still logs today's Valuation) and **Edit positions** for Stocks ([#8](https://github.com/adarsh645-git/finasset-360/issues/8)).
- **Holding detail, `/holdings/[id]`:**
  - The header: breadcrumb, Country and currency badges, and a kind tag ("Brokerage account" for every Stocks Holding).
  - The USD value and native line, with "· updated 47 days ago" when the Holding is Stale.
  - Actions: Update value / Edit positions, Edit, and Delete (click twice). Delete archives the Holding (ADR 0004) and unlinks its loans.
  - Stat cards, then Positions in this account and By sector for Stocks.
  - The value-over-time chart and the Value log.
  - A slot is left for `redesign-liabilities`' linked-loan card, "Your equity" stat and value-vs-loan chart.
- **The position drawer** (`?position=<holdingId>~<ticker>`): six stats, the Hand Price date ("as of 3 Aug"), "Open on Yahoo Finance ↗" for tickers Yahoo can show, and "View ⟨account⟩".
- **Stale cues** on the rows this change renders: a hand-priced Position whose price is over 30 days old reads "· price 47 days old" in the Positions card and in the positions editor, so the User can see which prices need re-typing.
- **Entry points turned on** through the shell's link registry (`src/lib/views/links.ts`):
  - The `holding` route family joins `EXISTING_ROUTES`. Overview's "Equity in financed assets" rows and the Holding rows of "Needs updating" then link to `/holdings/[id]`.
  - The `ADDING` flag turns on, which shows every "+ Add account or asset" button and the first-run card's Add button. They open `?modal=add-asset`.
- **Responsive behaviour** for these screens:
  - Phone: the bottom sheet, 16px inputs, 40px touch targets and fewer table columns.
  - The drawer is `min(400px, 100%)` wide.
  - Two-column sections stack below 820px of content width.

### Non-goals

- The loan form, the linked-loan card, the "Your equity" stat and the value-vs-loan chart (`redesign-liabilities`). The Asset | Liability toggle also waits for that change.
- "Save & next", the "i of N" counter and the summary step (`redesign-update-pass`).
- `/assets` and the class pages, including the breadcrumb links to them (`redesign-asset-pages`).
- Write routes, their validation, the ticker lookup route and the read model. `redesign-data-model` owns all of these, and this change only calls them.
- A "Delete permanently" action, entering past Valuations, editing a Value log entry, purchase lots, and automatic metal or Indian prices.

## Capabilities

### New Capabilities

- `holding-entry`: the add/edit modal's frame and state, the asset form per Asset Class, the Stocks positions editor with the Hand Price path, Update value and Edit positions, the footer validation copy, and the "+ Add account or asset" entry points.
- `holding-detail`: the `/holdings/[id]` page: header, kind tag, value and native line, actions with archive-by-Delete, stat cards, Positions and By sector, the value chart, the Value log, the Stale cues, and the incoming links it turns on.
- `position-drawer`: the Position drawer opened from a Positions row: its stats, Hand Price date, Yahoo Finance link rule and "View ⟨account⟩".

### Modified Capabilities

None (`openspec/specs/` is empty; the capabilities this change consumes are still in flight).

## Impact

- **Code:**
  - New view-models `src/lib/views/holding-entry.ts` (form state, positions-editor reducer and validation), `holding-detail.ts` and `position-drawer.ts`, plus a stale-cue helper.
  - New client components for the modal host, the asset form, the positions editor and the drawer, and the `/holdings/[id]` page.
  - Small edits to `redesign-shell-and-overview`'s files: the `(app)` layout mounts the modal host, and `links.ts` gains the `holding` family and `ADDING = true`.
- **Consumes:**
  - `src/lib/calc/`: history, 12-month change, Currency effect, Projection and staleness.
  - `src/lib/read-model/` (`loadPortfolio`).
  - `redesign-data-model`'s Holding, Valuation, archive and ticker-lookup routes.
  - From `redesign-shell-and-overview`: `src/lib/format/`, the chart primitive, the projection context, the `@container` two-column class and the link registry.
  - From `redesign-data-model`: `POST /api/holdings`, `PATCH /api/holdings/[id]`, `POST /api/holdings/[id]/valuations`, `POST /api/holdings/[id]/archive` (Delete archives and unlinks loans; there is no permanent delete) and `GET /api/tickers/lookup`, plus their `400 { error }` sentences, which show in the footer line.
- **Tests:** Vitest view-model and server-render tests under `tests/unit/`, named by HE, HD and PD scenario IDs. No new route tests: the routes are `redesign-data-model`'s.
- **Dependencies:** none added.
- **Docs:** CONTEXT.md's Sector entry gives "Financial Services" as an example, but the mockup's fixed list says "Financials". This change doesn't edit CONTEXT.md; the mismatch goes to the coordinator as a proposed glossary change.
