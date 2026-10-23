# Proposal

Depends on: `redesign-holding-entry`, `redesign-shell-and-overview`

## Why

After `redesign-holding-entry` a User can add Holdings and open each one, but there is no page that lists them all, and no page per Asset Class. The sidebar class rows, Overview's Allocation rows and the Assets nav item are still plain text. The mockup's Assets screen and its class pages (layout A, the approved one) fill that gap. They are change 5 in the [nine-change sequence](https://github.com/adarsh645-git/finasset-360/issues/16) of the [mockup redesign map](https://github.com/adarsh645-git/finasset-360/issues/13).

## What Changes

Two new pages, built on the shell, chart primitive, formatting helpers, modal and position drawer that earlier changes ship. No schema, route or calculation changes.

- **`/assets`** (mockup screen 2):
  - Header: total assets, "N accounts & assets in M classes · ±$ in 12 mo", and "+ Add asset".
  - Class tiles that filter the list. Clicking the selected tile again clears the filter.
  - One card with Group by Class | Country | None, Collapse/Expand all, and search. Search matches name, Description, city, tickers and company names, and a search opens collapsed groups.
  - Collapsible group headers (count with the class noun, share, total).
  - One-line rows: name and subtitle, Country badge, native amount, USD, and gain in USD and %. Rows open Holding detail.
  - "No holdings match." when a search or filter leaves nothing, and the empty state "No accounts or assets yet" + Add.
- **`/assets/[class]`** for the six fixed Asset Classes (mockup screen 3, layout A):
  - Breadcrumb; header with total, 12-month change, share of assets, and the projected rate (per Country for Real estate, Stocks and Cash, shared otherwise); the shared projection toggle; "+ Add to ⟨class⟩"; the full-size class chart.
  - **Stocks:** one Positions card with By sector | All positions, a sector distribution bar, collapsible sector rows with Expand/Collapse all, and the flat positions table. A position row opens the position drawer.
  - **Real estate:** the By property type and By location cards. Holdings with no city group as "Not set".
  - Then the table of the class's Holdings, and the empty state "No ⟨noun⟩s in ⟨class⟩ yet" + Add.
  - An unknown slug is a 404.
- **Phone layout** (< 640px): tables drop shares, gain, weight, Country and native columns, and sector rows move "% of stocks" into their subtitle. Tablet keeps every column.
- **Incoming links turn on:** the sidebar class rows, Overview's Allocation rows, the Assets nav item (sidebar, tablet tabs, phone tab bar), the Total assets stat card, and the Holding detail breadcrumb.
- **Unknown tickers:** the exchange shows "NSE" for a `.NS` ticker and "—" otherwise.
- Acceptance scenarios are tested against the screen view-models, plus server-rendered markup where a scenario is about links.

### Non-goals

- Layouts B (table) and C (treemap), the sector and property-type filter chips, and the Positions | Accounts toggle. They exist only in the unapproved layouts.
- The add/edit modal, the position drawer and Holding detail, which `redesign-holding-entry` owns. This change only links to them.
- Any write route, read-model field, schema change or new calculation.
- A range control on the class chart (the mockup has none), and remembering group, filter or search across visits.
- Liabilities, Growth and Goals links, which their own changes turn on.

## Capabilities

### New Capabilities

- `assets-list`: the `/assets` page: header, class tiles, grouping, collapse, search, rows, empty states, and the Assets nav item and Total assets stat card links.
- `asset-class-page`: the `/assets/[class]` pages: header, projected rates, class chart, the Stocks Positions card, the Real estate distribution cards, the Holdings table, empty state, and the sidebar class row, Allocation row and Holding detail breadcrumb links.

### Modified Capabilities

- `app-shell`: "The shell links only to pages that exist" now lists the Assets page and class pages; SH-08 expects the Assets and class-row links.
- `overview`: Total assets links to `/assets` (OV-08), and Allocation rows link to `/assets/<id>` (OV-10).
- `holding-detail`: Delete returns to the Holding's class page, not the Overview (HD-07).

## Impact

- **Code:** two pages under the signed-in route group, two view-models (`src/lib/views/assets.ts`, `src/lib/views/asset-class.ts`) with a shared row builder, and their client components. The `assets` and `assetClass` route families join `EXISTING_ROUTES` in `src/lib/views/links.ts`, which turns the links on in `shell.ts`, `overview.ts` and `holding-detail.ts`. `shell.ts` also gets the Assets active rule and the selected class row.
- **Consumes:** `loadPortfolio` (data-model), `src/lib/calc/` (history, 12-month change, Projection, defaults), `src/lib/format/`, `src/lib/chart/` and the chart component, the projection cookie (shell-and-overview), and the add-asset modal and position drawer search params (holding-entry).
- **Tests:** Vitest unit tests in `tests/unit/`, named by scenario ID. No route tests and no browser tests. Layout and phone column drops are checked by hand at 2000px, 800px and 390px.
- **Dependencies:** none added.
- **Glossary:** no new terms. "Not set" (a Real estate Holding with no city) is UI copy, not a domain term.
