# Proposal

Depends on: `redesign-liabilities`, `redesign-holding-entry`, `redesign-shell-and-overview`

## Why

The User updates 10–30 values once a month in one sitting (docs/SPEC.md l.20). After `redesign-shell-and-overview` the Overview's "Needs updating (N)" card lists every Stale item, but clearing it means about four clicks per item: open the item's page, open Update value, confirm, go back. That's around 55 clicks for 14 items, even when a house's value hasn't changed. The user chose a light guided pass on the existing modals ([#20](https://github.com/adarsh645-git/finasset-360/issues/20), option 2). It ships as change 7 of the [nine-change sequence](https://github.com/adarsh645-git/finasset-360/issues/16), after `redesign-liabilities`, because a pass covers both Holdings and loans and needs both modals.

## What Changes

- **"Update all (N)"** on the Overview's Needs updating card. It starts a pass over the Stale items, oldest first.
- **The pass is search-param state on the existing modal:** `?pass=<i>` and the Net Worth when the pass started (`from`) sit next to the modal params that `redesign-holding-entry` and `redesign-liabilities` already define. The summary is one new modal mode, `?modal=pass-summary`. There is no new page, route, nav item or table.
- **Each step opens the item's own form, pre-filled:**
  - Update value for a manually valued Holding;
  - Edit positions for a Stocks Holding with a stale Hand Price;
  - the balance edit for a Liability.
- **Step chrome:** an "i of N" counter, "Save & next" (the default action, so Enter confirms) and "Skip". Esc, × or Back leaves the pass.
- **Save & next records today's Valuation even when the value hasn't changed.** That clears Stale, and the pass moves on. On a Stocks step, Save & next sends `confirm_prices: true`, so unchanged Hand Prices are re-dated today and the Holding clears too. A plain Edit positions save outside a pass doesn't send it.
- **Skip moves on without recording anything.** The item stays Stale and stays on the card.
- **Leaving mid-pass keeps every save already made.** Nothing else is kept. "Update all" later starts a new pass over whatever is still Stale.
- **The list isn't frozen at the start.** Each step reads the live Stale list, so an item updated elsewhere drops out. A skipped item isn't offered again in the same pass.
- **Summary step:** "Net worth $X → $Y (+$Z)" plus how many items still need updating. It's computed during the pass and never stored.
- Responsive: the steps use the modal's phone bottom sheet. Touch targets are at least 40px. Checked by hand at ~2000px, ~800px and ~390px.

### Non-goals

- Stored check-in sessions, "since last pass" history and any record of a pass beyond the Valuations it saves.
- An "everything vs stale only" choice. The pass covers only Stale items.
- A dedicated page, route, nav item, badge or full-screen stepper.
- Reminders (email or push), per-class staleness thresholds, and any change to the 30-day rule.
- Changing what Update value, Edit positions or the balance edit do outside a pass. The pass only adds chrome and navigation around them.

## Capabilities

### New Capabilities

- `update-pass`: the guided pass over Stale items. Covers its entry on the Needs updating card, order and counter, Save & next, Skip and leaving, how the live Stale list is followed, the Stocks confirmation, and the Net Worth summary.

### Modified Capabilities

None (`openspec/specs/` is empty). The "Update all (N)" button sits on the `overview` card, but its behaviour is specified here under `update-pass`.

## Impact

- **Code:** a new screen view-model `src/lib/views/update-pass.ts`, plus pass chrome (counter, Save & next, Skip, summary) added to the modal component from `redesign-holding-entry`. The "Update all (N)" link goes on the Needs updating card from `redesign-shell-and-overview`. The numbers come from `src/lib/calc/` and `loadPortfolio`. Formatting comes from `src/lib/format/`.
- **APIs and schema:** none new. Saves go through the existing Holding Valuation, Holding edit and Liability balance routes from `redesign-data-model`.
- **Relies on other changes:**
  - `confirm_prices: true` on `PATCH /api/holdings/[id]` re-dates unchanged Hand Prices (data-model D6). Edit positions resends every Position (holding-entry).
  - holding-entry's D19 mode table and footer slot.
  - The Needs updating list, oldest first then by name (shell-and-overview), which the pass reuses as is.
- **Tests:** Vitest view-model and server-render tests in `tests/unit/`, and one route test against local Postgres in `tests/route/`, each named by scenario ID.
- **Docs:** proposed glossary term **Update pass** (CONTEXT.md is not edited in this change). It supersedes the retired Check-in.
