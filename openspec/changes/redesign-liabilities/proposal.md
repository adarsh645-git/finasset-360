# Proposal

Depends on: `redesign-holding-entry`, `redesign-shell-and-overview`, `redesign-data-model`

## Why

After `redesign-asset-pages` the app shows everything a User owns but nothing they owe: there is no Liabilities page, no Loan detail and no way to add a loan, so Net Worth, Equity and the Projection run on whatever the seed script put in. The mockup's screens 6, 7 and the liability side of screen 10 ([map #13](https://github.com/adarsh645-git/finasset-360/issues/13), [Liabilities as loans #3](https://github.com/adarsh645-git/finasset-360/issues/3)) close that gap. This is change 6 of the [nine-change sequence](https://github.com/adarsh645-git/finasset-360/issues/16), and `redesign-update-pass` needs its balance edit next.

## What Changes

- **`/liabilities`** (new page):
  - Header: total owed in USD and "⟨amount⟩ paid down in 12 mo", using the like-for-like 12-month rule from `redesign-calculations` ("—" when no loan has a year of history). Controls: the shared projection toggle and "+ Add loan".
  - Four stats: Monthly payments (USD), Weighted rate (by current balance), Debt-free date or "Not on track", and Interest remaining.
  - **Payoff timeline:** every loan's balance stacked, recorded history then a dashed projection that assumes current payments continue.
  - **Loan rows**, largest balance first: colour, name, Country, USD (+ native for India), a paid-off bar, "N% paid · rate · ⟨Monthly payment⟩/mo", and "Secures ⟨Holding⟩ · Paid off ⟨month⟩" or "No payoff at this payment". Each row opens its Loan detail.
  - Empty state: "No loans" + Add loan, with "—" stats and no chart.
- **`/liabilities/[id]` Loan detail** (new page): breadcrumb, balance in USD + native line, the paid-off bar ("N% of principal paid off · ⟨principal⟩ borrowed in ⟨month⟩"), stats (Interest rate, Monthly payment, Projected payoff, Interest remaining), "Balance over time" with the payoff projection and the linked Holding's value line, and a "Secured against" card with Equity. Actions: **Update balance** (logs today's Valuation), **Edit**, and **Delete (click twice)**, which archives ([ADR 0004](../../../docs/adr/0004-archive-not-delete.md)).
- **Loan form** in the shared add/edit modal (the modal shell is `redesign-holding-entry`'s):
  - The Asset | Liability toggle in add mode.
  - Loan name, Held in, Current balance, Original principal (optional, defaults to the balance, stored as the larger of the two), Interest rate (% APR), Monthly payment / EMI with the escrow hint, Borrowed in (month, default this month), Term (optional), Linked asset (optional, one Holding per loan), and a "Credit card (revolving)" checkbox.
  - The prototype's validation copy in the footer.
  - An Update balance mode, which logs today's Valuation even when the balance is unchanged.
- **Equity on Holding detail**, in the slots `redesign-holding-entry` leaves: the Linked loan card, the "Your equity" stat, and the "Value vs. loan" chart with the shaded Equity gap.
- **Stale cue for loans:** "· 47 days old" on rows, "· updated 47 days ago" on Loan detail, only when the Liability is Stale.
- **Incoming links turned on** through the shell's link registry: the Liabilities nav item (sidebar, tablet tabs, phone tab bar), the Overview Liabilities stat card, Overview "Needs updating" loan rows, and the first-run card's "or a loan" link (opens the loan form).
- Responsive behaviour for all of the above at ~2000px, tablet (~800px) and phone (~390px).

### Non-goals

- Schema, routes, validation rules and the read model (`redesign-data-model` owns them; this change only calls them).
- The modal shell, bottom sheet and footer error line (`redesign-holding-entry`), and "Save & next" on the balance edit (`redesign-update-pass`).
- "Debt paid down" on Growth and the Year-by-year debt column (`redesign-growth`).
- Variable or floating rates, rate schedules, credit limits or utilisation, loans with no payment, several loans securing one Holding, back-filled or hand-dated past balances, and a "Delete permanently" action ([#3](https://github.com/adarsh645-git/finasset-360/issues/3), [#4](https://github.com/adarsh645-git/finasset-360/issues/4)).

## Capabilities

### New Capabilities

- `liabilities-page`: the `/liabilities` screen: total and 12-month paid down, the four stats, the payoff timeline, loan rows with stale cue, the empty state, and the incoming Liabilities links.
- `loan-detail`: the `/liabilities/[id]` screen (balance, paid-off bar, stats, balance chart, Secured against, stale cue, Delete) plus the Equity surfaces a linked loan adds to Holding detail.
- `loan-entry`: the loan side of the add/edit modal (Asset | Liability toggle, fields, defaults, validation copy, linked Holding choice) and the Update balance mode.

### Modified Capabilities

None (`openspec/specs/` is empty).

## Impact

- **Code:** new routes `src/app/(app)/liabilities/page.tsx` and `[id]/page.tsx`; view-models `src/lib/views/liabilities.ts`, `loan-detail.ts`, `loan-form.ts` and `holding-equity.ts`; the loan form inside the shared modal; five loan colour tokens. The `liabilities` and `liability(id)` route families and the "or a loan" add link are switched on in the link registry (`src/lib/views/links.ts`), which turns on every incoming link at once. Holding detail's equity slots are filled.
- **Consumes:** `src/lib/calc/` (amortization, Not on track, interest remaining, 12-month set change, interpolation, Equity, staleness); `loadPortfolio` through the `(app)` layout's request-scoped loader; the Liabilities write routes from `redesign-data-model`; the modal shell from `redesign-holding-entry`; from `redesign-shell-and-overview`, the chart primitive (stacked areas with a base, per-series tooltip values, date x-axis, projection trimming), the projection context, the `@container` two-column class, `RowLink` and the `src/lib/format/` helpers (FM-01…FM-10).
- **Relies on `redesign-data-model`'s rules:** one active loan per Holding (DM-32), principal stored as max(principal, balance), start month defaulting to this month, and today's Valuation upserted on every save (DM-28…DM-31). A Liability's Country is fixed after creation (`PATCH` requires the same `country`), so the form locks "Held in" when editing. Delete calls the archive route; there is no permanent delete.
- **Tests:** Vitest view-model and `renderToStaticMarkup` tests in `tests/unit/`, named by scenario ID (LB, LD, LE). No route tests: the routes and their tests belong to `redesign-data-model`.
- **Docs:** no CONTEXT.md or ADR changes. "Loan" stays the UI word for a Liability.
- **Dependencies:** none added.
