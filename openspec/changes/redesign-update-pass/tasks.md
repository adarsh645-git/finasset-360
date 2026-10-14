# Tasks

## 1. Update all: walk the Stale items with Save & next and Skip

Blocked by: none
The Needs updating card offers "Update all (N)". It opens a pass that walks the live Stale list in the card's order (D3, D4). Each step opens the item's own form pre-filled: Update value, Edit positions or the balance edit. The footer shows the "i of N" counter, Skip and Save & next. Save & next records today's figure, even when unchanged, and moves on. Skip moves on without recording. Esc, × or Back leaves and keeps what was saved (D1, D2, D5, D6, D7, D9). After the last item the pass closes, until ticket 2 adds the summary.

- [ ] 1.1 Tests named UP-01, UP-02, UP-03, UP-04, UP-05, UP-06, UP-07, UP-08, UP-09, UP-10, UP-11, UP-12, UP-13 written and failing (red)
- [ ] 1.2 `updateAllEntry` gives "Update all (N)" with a link to step 1 on the card's first item, carrying `pass=1` and `from`, and nothing when nothing is Stale. The card renders it in its header (UP-01, UP-02)
- [ ] 1.3 `passStep` picks the form by kind and gives the counter, next and skip targets from the live list with the cursor rule, including the not-Stale fallback (UP-03, UP-04, UP-09, UP-10, UP-12, UP-13)
- [ ] 1.4 `ModalHost` reads `pass` and `from`, fills the footer slot, and after a successful save calls `router.replace(nextHref)` then `router.refresh()`. A rejected save keeps the step and shows the footer error (UP-05, UP-06, UP-07)
- [ ] 1.5 Save & next is the form's submit button and Skip is `type="button"`. Esc, × and a backdrop click clear every modal and pass param (UP-08, UP-11)
- [ ] 1.6 Route test: an unchanged value posted to the Holding and Liability Valuation routes makes the item fresh in `GET /api/portfolio` (UP-05)
- [ ] 1.7 Tests named UP-01, UP-02, UP-03, UP-04, UP-05, UP-06, UP-07, UP-08, UP-09, UP-10, UP-11, UP-12, UP-13 pass in CI suites; npm run spec:coverage passes
- [ ] 1.8 Checked by hand against the mockup's Update value modal and Overview at 2000px, 800px and 390px: Enter confirms, Esc leaves, Back leaves, focus lands in the value input, the phone bottom sheet's footer fits the counter and both buttons at 40px

## 2. Summary step: how Net Worth moved

Blocked by: 1
After the last item the pass ends on a summary instead of closing: "Net worth $X → $Y (±$Z)", from the starting figure the pass carried and today's Net Worth, plus how many items still need updating. It's computed, never stored, and "Done" closes it (D8).

- [ ] 2.1 Tests named UP-15, UP-16, UP-17 written and failing (red)
- [ ] 2.2 `passSummary` formats X, Y and Z with `src/lib/format/` and reconciles them in whole dollars, with the right sign (UP-15)
- [ ] 2.3 The still-Stale line is counted live, pluralised, and absent at 0 (UP-16)
- [ ] 2.4 A missing or invalid `from` shows only "Net worth $Y" (UP-17)
- [ ] 2.5 `ModalHost` registers the `pass-summary` mode, and the last Save & next or Skip leads there. Done is the default action and clears the params. Nothing is written to the database or browser storage (`git diff` shows no migration and no storage calls)
- [ ] 2.6 Tests named UP-15, UP-16, UP-17 pass in CI suites; npm run spec:coverage passes
- [ ] 2.7 Checked by hand at 2000px, 800px and 390px: the summary in the dialog and bottom sheet, Enter closes it, the Overview behind it shows the new Net Worth

## 3. Stocks step: confirming Positions clears staleness

Blocked by: 1
A Stocks Holding with a stale Hand Price opens Edit positions in the pass. Save & next sends `confirm_prices: true`, so confirming unchanged prices dates every Hand Price today and takes the Holding off the list. The plain Edit positions save outside a pass doesn't send it. Enter in the new-position row still adds a row rather than confirming the step (D5, D6).

- [ ] 3.1 Tests named UP-14 written and failing (red)
- [ ] 3.2 Route test: `PATCH /api/holdings/[id]` with the unchanged Positions and `confirm_prices: true` dates each Hand Price today with its price unchanged, and `GET /api/portfolio` shows the Holding fresh. The same PATCH without the flag leaves the dates and the Holding Stale (UP-14)
- [ ] 3.3 In a pass, the Edit positions request carries `confirm_prices: true`, and outside a pass it doesn't (the form's request builder is checked for both cases under UP-14)
- [ ] 3.4 The Edit positions step opens with focus on Save & next, and a successful save moves to the next step like any other
- [ ] 3.5 Tests named UP-14 pass in CI suites; npm run spec:coverage passes
- [ ] 3.6 Checked by hand at 2000px, 800px and 390px: Enter in the ticker, shares or avg cost inputs adds a row, Enter on Save & next confirms the step, the stale "price N days old" rows are visible before confirming

## Workflow follow-up

- Run `/opsx:verify redesign-update-pass` once every ticket is done, then open the PR.
- The user runs `/opsx:archive` after merge.
