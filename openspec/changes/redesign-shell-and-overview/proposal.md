# Proposal

Depends on: `redesign-data-model`, `redesign-calculations`

## Why

After `redesign-data-model`, production shows only a signed-in "Being rebuilt" page. The new schema and read model hold real data, but nothing displays it. Every later page change in the [nine-change sequence](https://github.com/adarsh645-git/finasset-360/issues/16) also needs the same shell, design tokens, theme, chart and number formatting. This change builds those shared pieces once and uses them for the first real screen, the Overview, so the User can see their Net Worth again. It is change 3 of 9 ([map #13](https://github.com/adarsh645-git/finasset-360/issues/13)).

## What Changes

- **Design tokens:** the mockup README's tokens become Tailwind v4 `@theme` variables, replacing the old palette. They cover the light and dark colours, the six Asset Class colours, the two Country colours, radii and type, with Geist and Geist Mono and tabular numbers.
- **Theme:** a light/dark toggle saved in a `theme` cookie. The server reads the cookie and sets `data-theme` on `<html>`, so the page never flashes the wrong theme. With no cookie, the theme is light.
- **Signed-in shell** (a route-group layout):
  - At ≥1024px, a 240px sticky sidebar with the brand, Net Worth and its 12-month change, the five nav items (Assets and Liabilities with compact totals), an "Asset classes" list showing only classes that have Holdings, each with its colour dot, a "+ Add" button slot, the theme toggle and the sign-in chrome.
  - At 640–1023px, a sticky top bar plus a row of scrolling tabs.
  - Below 640px, a top bar plus a fixed bottom tab bar that respects the safe-area inset, with about 76px of bottom spacing.
  - Two-column sections stack when the content area is under 820px. Buttons and selects are at least 40px tall on coarse pointers and phones, and inputs use 16px text on phones.
- **Sign-in chrome re-homed:** the User's first name and Sign out move into the shell.
- **Links only to routes that exist:** in this change only `/` exists. Every other nav item, class row and card row is plain text. Each later change switches its own incoming links on through one shared registry. "+ Add" buttons are hidden until `redesign-holding-entry`.
- **Chart primitive:** one shared, hand-rolled SVG chart with pure, unit-tested geometry. It draws area and line series, stacked bases, a dashed projection after today with a shaded region and a "Today → projected" marker, and goal lines (accepted as input; `redesign-goals` passes them). It also has a crosshair tooltip, touch support (tap or drag; the tooltip clears about 1.8s after release; `touch-action: pan-y`), the phone rules (height × 0.78, a 36px y-axis, no end labels) and a legend slot.
- **Projection on/off** is shared by every chart and saved in a `projection` cookie (default on). The range (1Y / 3Y / 5Y / All) is a `?range=` search parameter.
- **Formatting helpers:** `$1,234`, `₹62,00,000` (en-IN grouping), compact `$1.2M`, signed `+$`/`−$`, percentages, "Oct 2026", "in 3 yrs", "47 days old" and "—" for absent figures. A share of a $0 total is 0%.
- **Overview (`/`):**
  - The header has Net Worth, the change since the range start, the range control and the projection toggle.
  - The Net Worth chart shows assets and liabilities in its tooltip.
  - Three stat cards: Total assets, Liabilities (paid down in 12 mo) and Equity built.
  - The left column has Allocation and Equity in financed assets. Equity is hidden when there are no linked pairs.
  - The right column has "Where it's held", which lists only the Countries in use, and the Currency effect 12 mo line, hidden when there are no India items. Below them is the Needs updating card, shown only when something is Stale. Its rows run oldest first and link to the detail page once that page exists. Last is an empty slot reserved for the Goals card.
- **First-run state:** with no current Holdings or Liabilities, the Overview shows only the $0 header and one "Add your first account or asset" card, with no chart, stats or other cards. The sidebar shows $0 and "—".

### Non-goals

- The add/edit modal, Holding detail, Assets and class pages, Liabilities, Growth, Goals and the update pass. Each belongs to its own change, and so do the incoming links and "+ Add" behaviour those changes switch on.
- The Overview Goals card, the goal lines on the Overview chart and the Goals nav count (`redesign-goals`). This change leaves a slot and accepts goal lines as chart input.
- New calculations. Every number comes from `src/lib/calc/` (`redesign-calculations`) through the read model (`redesign-data-model`).
- Write routes, schema or migrations. This change only reads data.
- A redesign of the login page. It picks up the new tokens and nothing more.
- Browser-automated tests. Layout, breakpoints, hover and touch are checked by hand.

## Capabilities

### New Capabilities

- `app-shell`: the signed-in frame: design tokens, the cookie theme toggle, the responsive nav (sidebar, tablet tabs, phone tab bar) with its totals, Asset class list and active item, the sign-in chrome, the links-only-to-existing-routes rule, and the frame's first-run state.
- `charts`: the shared chart: scales and ticks, series and stacked bases, the projection split and marker, goal lines, end labels, crosshair and touch tooltip, the shared projection toggle and the phone rules.
- `overview`: the Overview page: header and range, the Net Worth chart, stat cards, Allocation, Equity in financed assets, Where it's held, Currency effect, Needs updating, the Goals slot and the first-run card.
- `formatting`: how money, rupees, compact and signed amounts, percentages, dates, durations and ages are written everywhere in the app.

### Modified Capabilities

None (`openspec/specs/` is empty).

## Impact

- **Code:**
  - The route group `src/app/(app)/` gets a layout and the Overview page, replacing the interim "Being rebuilt" page at `/`.
  - `src/app/layout.tsx` reads the `theme` cookie, and `src/app/globals.css` is rewritten with the tokens.
  - New modules: `src/components/shell/`, `src/components/chart/`, `src/lib/chart/`, `src/lib/format/`, `src/lib/views/shell.ts`, `src/lib/views/overview.ts` and `src/lib/views/links.ts` (the route registry).
  - `SignOutButton` and `firstNameOrEmail` are reused.
- **Depends on:** `redesign-data-model` (`loadPortfolio`, `PortfolioData`, the interim page, the CI jobs) and `redesign-calculations` (history, 12-month change, attribution, Equity, staleness).
- **Cross-change contract added:** the link registry in `src/lib/views/links.ts`. Each later change adds its route there to switch on links into it.
- **Tests:** Vitest unit tests in `tests/unit/` for the formatting helpers, chart geometry and the shell and Overview view-models, plus `renderToStaticMarkup` tests for markup scenarios. No route tests are added.
- **Dependencies:** none added.
- **Glossary:** no new domain terms. "Needs updating" is the card's UI label for Stale items, and "first-run state" is a UI state, not a domain term.
