# Proposal

Depends on: none

## Why

The mockup redesign ([map #13](https://github.com/adarsh645-git/finasset-360/issues/13)) changes nearly every number the app shows. Net Worth is now in USD and history is converted with each date's FX Rate. History is interpolated between Valuations. The Projection runs month by month, per Country and per Asset Class, and includes Monthly savings and amortizing Liabilities. Goals get derived dates. The app can't be rebuilt screen by screen until these rules exist and are proven, so this change goes first in the [nine-change sequence](https://github.com/adarsh645-git/finasset-360/issues/16).

## What Changes

Pure calculation functions only: no UI, no schema and no routes. They are added next to the old ones, which keep working until `redesign-data-model` deletes them.

- **Projection engine** (new, rewritten rather than extended):
  - Each Holding compounds at its Asset Class's rate for its Country.
  - Each Liability amortizes by its APR and Monthly payment. The engine reports each loan's payoff month and interest remaining, and flags "Not on track".
  - Each Country's Monthly savings rise yearly by the savings growth rate and are invested at that Country's Stocks rate. Freed Monthly payments join at a flat amount.
  - FX is held flat at today's FX Rate.
  - A blank assumption means its default.
  - The output is monthly series per Holding, Liability, Asset Class, Country and total.
- **History rules:**
  - The value at any date is interpolated between Valuations: 0 before the first, flat after the last, and 0 after archiving.
  - History is sampled at month-ends plus today.
  - The FX Rate for a date is the latest rate on or before it.
  - 12-month change returns "—" for an item with no history that far back.
  - Today's dollars deflates each Country at its own inflation.
  - Change attribution splits a range's change into asset growth, debt paid down and Currency effect, and the three add up exactly.
- **Equity:** an asset's value minus its linked loan, % owned (clamped to 0–100%), and Equity built.
- **Goal status:** Reached, Projected or Beyond the N-year projection, from one monthly Net Worth series, plus progress.
- **Staleness:** one 30-day rule, measured from user-entered dates only.
- Acceptance scenarios are unit-level. These are pure functions, so "user-visible" here means the numbers that later changes show.

### Non-goals

- Any UI, route, schema, migration or cron change. Those start in `redesign-data-model`.
- Deleting the old engine or old helpers (`redesign-data-model` does that).
- Formatting and copy (labels like "in 3 yrs", "· 47 days old"). These functions return data, and each page change formats it.
- An FX depreciation assumption, per-Holding rate overrides, Countries beyond US and India, variable-rate loans and loans with no payment.
- Back-filling history before the first Valuation.

## Capabilities

### New Capabilities

- `projection`: the monthly forward Projection: Holdings compounding, Liabilities amortizing (payoff, interest remaining, Not on track), Monthly savings with freed payments, defaults for blank assumptions, and FX held flat.
- `net-worth-history`: past values: interpolation between Valuations, sample dates, FX Rate by date, USD conversion, 12-month change, today's dollars, and change attribution with the Currency effect.
- `equity`: Equity, % owned and Equity built for Holdings linked to a Liability, at any point, recorded or projected.
- `goal-status`: a Goal's derived status and progress, from a Net Worth series and the User's horizon.
- `staleness`: when a Holding or Liability is Stale, and how old its user-entered figure is.

### Modified Capabilities

None (`openspec/specs/` is empty).

## Impact

- **Code:** a new calculations module under `src/lib/`, with its own plain input types and no imports from the old `components/portfolio/types`. The old `src/lib/projection/*`, `net-worth/*` and `valuations/staleness.ts` stay untouched.
- **Tests:** new Vitest unit tests in `tests/unit/`, named by scenario ID. `npm run spec:coverage` gates them.
- **Dependencies:** none added.
- **Docs:** CONTEXT.md's Monthly savings entry now says freed payments don't rise (settled while proposing). The mockup handoff (`docs/design/portfolio-tracker/`) is still only on the unmerged `docs/mockup-handoff` branch. Its Calculations section is the source for these formulas.
