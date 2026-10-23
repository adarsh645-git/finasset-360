# Tasks

## 1. Liabilities page with loan rows

Blocked by: none
`/liabilities` shows the total owed, 12 months of paid down, the four stats, one row per active loan (with stale cue and loan colours), and the empty state. The Liabilities nav item, the Overview Liabilities stat card and "Needs updating" loan rows become links (D7, D8, D10, D17, D19, D20). Data comes from `npm run seed` until ticket 4.

- [x] 1.1 Tests named LB-01, LB-02, LB-03, LB-04, LB-05, LB-06, LB-07, LB-08, LB-09, LB-12, LB-13 written and failing (red)
- [x] 1.2 `liabilities.ts` view-model returns header, stats, rows and empty state from `PortfolioData` and calc, with no math of its own (LB-01…LB-09, LB-12)
- [x] 1.3 `liabilities` and `liability(id)` route families added to `EXISTING_ROUTES`, and the nav item is active on `/liabilities` and Loan detail (LB-13)
- [x] 1.4 `--loan-1…5` tokens added for light and dark
- [x] 1.5 Tests named LB-01, LB-02, LB-03, LB-04, LB-05, LB-06, LB-07, LB-08, LB-09, LB-12, LB-13 pass in CI suites; npm run spec:coverage passes
- [ ] 1.6 Checked by hand against the mockup's Liabilities screen (without the timeline) at 2000px, 800px and 390px, including the empty state

## 2. Payoff timeline

Blocked by: 1
The Liabilities page gains the payoff timeline: balances stacked by loan, history then a dashed projection, archived loans counted while held, and trimmed at today when the projection is off (D11).

- [x] 2.1 Tests named LB-10, LB-11 written and failing (red)
- [x] 2.2 The stack's top equals total Liabilities at every sample, and each layer is 0 from its payoff month (LB-10)
- [x] 2.3 Archived loans appear only up to their archive date, and the tooltip shows each loan's own balance (LB-11)
- [x] 2.4 Tests named LB-10, LB-11 pass in CI suites; npm run spec:coverage passes
- [ ] 2.5 Checked by hand against the mockup's payoff timeline at 2000px, 800px and 390px, including touch on phone

## 3. Loan detail

Blocked by: 1
`/liabilities/[id]` shows the balance and native line, the paid-off bar, the four stats, "Balance over time" with the linked Holding's line, the Secured against card, and the stale cue. Unknown or archived ids show not found (D9, D12, D17). Loan rows already link here from ticket 1.

- [x] 3.1 Tests named LD-01, LD-02, LD-03, LD-04, LD-05, LD-06, LD-07, LD-08, LD-09, LD-11 written and failing (red)
- [x] 3.2 `loan-detail.ts` returns the header, bar, stats, chart series and card, or null for an id that isn't an active Liability of the User (LD-01…LD-09, LD-11)
- [x] 3.3 Tests named LD-01, LD-02, LD-03, LD-04, LD-05, LD-06, LD-07, LD-08, LD-09, LD-11 pass in CI suites; npm run spec:coverage passes
- [ ] 3.4 Checked by hand against the mockup's Loan detail at 2000px, 800px and 390px

## 4. Add and edit a loan

Blocked by: 3
The shared modal gains the Asset | Liability toggle and the loan form, with defaults, the escrow hint, Borrowed in, the revolving checkbox, the linked Holding picker and the prototype's validation copy. Adding opens the new Loan detail, and Edit loan on Loan detail saves today's balance. "+ Add loan", the empty state's "Add loan" and the first-run "or a loan" link open it (D3, D4, D13, D14, D15).

- [x] 4.1 Tests named LE-01, LE-02, LE-03, LE-04, LE-05, LE-06, LE-07, LE-09 written and failing (red)
- [x] 4.2 `loan-form.ts` builds the initial state, validates in the prototype's order, builds the create and edit bodies, and lists link options (LE-03, LE-04, LE-06)
- [x] 4.3 The toggle shows only in add mode and keeps Name and Held in, and Held in is disabled in edit (LE-01, LE-02, LE-07)
- [x] 4.4 Add pushes the new Loan detail; edit closes and refreshes; route errors show in the footer (LE-05, LE-07)
- [x] 4.5 The "or a loan" add link is turned on in `links.ts`, and every add-loan link opens `?modal=add-liability` (LE-09)
- [x] 4.6 Tests named LE-01, LE-02, LE-03, LE-04, LE-05, LE-06, LE-07, LE-09 pass in CI suites; npm run spec:coverage passes
- [ ] 4.7 Checked by hand against the mockup's add/edit modal (Liability side) at 2000px, 800px and 390px (bottom sheet)

## 5. Update balance and Delete

Blocked by: 3
Loan detail's Update balance opens a one-input modal that records today's balance, even when unchanged, clearing the stale cue. Delete (click twice) archives the loan and returns to `/liabilities`, with its history kept (D6, D16).

- [x] 5.1 Tests named LE-08, LD-10 written and failing (red)
- [x] 5.2 Update balance shows "Current balance of ⟨name⟩" and the "Was … · logged as today’s value" line, validates the balance, and refreshes (LE-08)
- [x] 5.3 Delete reads "Confirm delete" on the first click, archives on the second, and resets on navigation (LD-10)
- [x] 5.4 Tests named LE-08, LD-10 pass in CI suites; npm run spec:coverage passes
- [ ] 5.5 Checked by hand on Loan detail at 2000px, 800px and 390px

## 6. Equity on Holding detail

Blocked by: 3
A Holding secured by a loan shows the Linked loan card (linking to its Loan detail), the "Your equity" stat, and the "Value vs. loan" chart with the shaded Equity gap (D18).

- [x] 6.1 Tests named LD-12, LD-13, LD-14 written and failing (red)
- [x] 6.2 `holding-equity.ts` returns null for an unlinked Holding, otherwise the card, the stat and the chart series, all from calc's Equity (LD-12…LD-14)
- [x] 6.3 Holding detail renders them in holding-entry's slots, and an unlinked Holding's page is unchanged
- [x] 6.4 Tests named LD-12, LD-13, LD-14 pass in CI suites; npm run spec:coverage passes
- [ ] 6.5 Checked by hand against the mockup's financed property detail at 2000px, 800px and 390px

## Workflow follow-up

- Run `/opsx:verify redesign-liabilities` once every ticket is done, then open the PR.
- The user runs `/opsx:archive` after merge.
