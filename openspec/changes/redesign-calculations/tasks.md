# Tasks

## 1. Calculations module, defaults and Staleness

Blocked by: none
The new calculations module exists beside the old helpers, with its own plain input types (D1). It carries the six Asset Classes and the US/India defaults, resolves blank Projection Assumptions to them (D6), and answers whether a Holding or Liability is Stale and how old its user-entered figure is (D14). This proves the single test seam and the `spec:coverage` wiring end to end.

- [ ] 1.1 Tests named PR-01, ST-01, ST-02, ST-03, ST-04, ST-05 written and failing (red)
- [ ] 1.2 The module defines its own input types in CONTEXT.md vocabulary and imports nothing from the old portfolio types; no existing file under `src/lib/` changes (`git diff --stat` shows only new files)
- [ ] 1.3 Blank assumptions resolve to the defaults table, and a filled-in 0 is kept (PR-01)
- [ ] 1.4 Staleness reports the age in whole UTC calendar days and Stale only above 30. A Stocks Holding with no Hand Price is never Stale (ST-01…ST-05)
- [ ] 1.5 Tests named PR-01, ST-01, ST-02, ST-03, ST-04, ST-05 pass in CI suites; npm run spec:coverage passes

## 2. Projection: Holdings compound

Blocked by: 1
The Projection returns monthly series from today over the User's horizon. Each Holding compounds at its Asset Class rate for its Country, with FX held flat at today's rate (D2, D3).

- [ ] 2.1 Tests named PR-02, PR-03, PR-05, PR-06, PR-07 written and failing (red)
- [ ] 2.2 Series run from month 0 to horizon × 12 inclusive, and month 0 equals current values (PR-03, PR-05)
- [ ] 2.3 Native values follow v × (1+r)^(k/12), with r chosen by class and Country, checked against the closed form (PR-02, PR-06)
- [ ] 2.4 India figures convert at today's FX Rate at every month (PR-07)
- [ ] 2.5 Tests named PR-02, PR-03, PR-05, PR-06, PR-07 pass in CI suites; npm run spec:coverage passes

## 3. Projection: Liabilities amortize

Blocked by: 2
Each Liability amortizes by its APR and Monthly payment. The Projection reports its payoff month (even past the horizon) and interest remaining, flags Not on track with the 720-month limit, and nets Liabilities against Holdings into Net Worth (D4).

- [ ] 3.1 Tests named PR-04, PR-08, PR-09, PR-10, PR-11, PR-12, PR-13, PR-14 written and failing (red)
- [ ] 3.2 The payoff month matches the annuity formula, and the balance stays 0 after payoff (PR-08, PR-09)
- [ ] 3.3 Interest remaining equals total paid minus today's balance, and payoff past the horizon is still reported (PR-11, PR-12)
- [ ] 3.4 Not on track covers payment ≤ interest and payoff beyond 720 months, and such a balance grows with no payoff or interest remaining (PR-13, PR-14)
- [ ] 3.5 Month-0 Net Worth equals today's, and a higher Monthly payment strictly raises projected Net Worth (PR-04, PR-10)
- [ ] 3.6 Tests named PR-04, PR-08, PR-09, PR-10, PR-11, PR-12, PR-13, PR-14 pass in CI suites; npm run spec:coverage passes

## 4. Projection: Monthly savings and roll-ups

Blocked by: 3
Each Country's Monthly savings are invested at its Stocks rate, step up once a year, and are joined by freed Monthly payments at a flat amount. The Projection rolls everything up by Asset Class, Country and total, with savings in the Stocks class and never in a Holding (D5).

- [ ] 4.1 Tests named PR-15, PR-16, PR-17, PR-18, PR-19, PR-20, PR-21 written and failing (red)
- [ ] 4.2 The savings pool matches the annuity future-value formula and steps yearly by the savings growth rate (PR-15, PR-16)
- [ ] 4.3 Blank savings reproduce the no-savings Projection (PR-17)
- [ ] 4.4 Freed payments start the month after payoff and don't escalate (PR-18, PR-19)
- [ ] 4.5 Roll-ups reconcile at every month, and savings appear in Stocks and Country assets but in no Holding (PR-20, PR-21)
- [ ] 4.6 Tests named PR-15, PR-16, PR-17, PR-18, PR-19, PR-20, PR-21 pass in CI suites; npm run spec:coverage passes

## 5. History: values, FX and 12-month change

Blocked by: 1
Any Holding's or Liability's value on any date, by interpolation between Valuations (D7). Also: history sample dates, the FX Rate for a date with its as-of date (D8), past Net Worth in USD at each date's rate, and 12-month change for an item and for a set (D9).

- [ ] 5.1 Tests named NH-01, NH-02, NH-03, NH-04, NH-05, NH-06, NH-07, NH-08, NH-09, NH-10 written and failing (red)
- [ ] 5.2 The value on a date: 0 before the first Valuation, linear by day, flat after the last, 0 after archive, with the current value acting as today's Valuation (NH-01, NH-02, NH-03)
- [ ] 5.3 Sample dates are start, month-ends and today, with the start clamped to the earliest Valuation (NH-04)
- [ ] 5.4 FX lookup takes the latest rate on or before the date, falls back to the earliest, and reports its as-of date (NH-05)
- [ ] 5.5 Past Net Worth converts each date at that date's FX Rate (NH-06)
- [ ] 5.6 12-month change is absent for an item with no Valuation by the start, and a set counts only items present at the start (NH-07…NH-10)
- [ ] 5.7 Tests named NH-01, NH-02, NH-03, NH-04, NH-05, NH-06, NH-07, NH-08, NH-09, NH-10 pass in CI suites; npm run spec:coverage passes

## 6. Today's dollars and change attribution

Blocked by: 5
Any series restated in Today's dollars, each Country at its own inflation (D10). A range's Net Worth change split into asset growth, debt paid down and Currency effect, which sum exactly, for any Country scope (D11).

- [ ] 6.1 Tests named NH-11, NH-12, NH-13, NH-14, NH-15, NH-16, NH-17 written and failing (red)
- [ ] 6.2 Deflation uses whole calendar months, restating the past upward and the future downward, and Countries are deflated before summing (NH-11, NH-12)
- [ ] 6.3 The three attribution terms sum to the Net Worth change within $0.01, with the right Currency effect signs for India assets and Liabilities (NH-13, NH-14, NH-15)
- [ ] 6.4 Country scope filters items, and a Holding added mid-range counts fully as asset growth (NH-16, NH-17)
- [ ] 6.5 Tests named NH-11, NH-12, NH-13, NH-14, NH-15, NH-16, NH-17 pass in CI suites; npm run spec:coverage passes

## 7. Equity

Blocked by: 3
Equity, % owned and Equity built for Holdings linked to a Liability, for recorded values and for projected series point by point (D12).

- [ ] 7.1 Tests named EQ-01, EQ-02, EQ-03, EQ-04, EQ-05, EQ-06 written and failing (red)
- [ ] 7.2 Equity is value minus balance in USD, and follows a projected pair month by month, equalling the value after payoff (EQ-01, EQ-02, EQ-03)
- [ ] 7.3 % owned is clamped to 0–1, with a value of 0 giving 0, and Equity built sums every link or is 0 with none (EQ-04, EQ-05, EQ-06)
- [ ] 7.4 Tests named EQ-01, EQ-02, EQ-03, EQ-04, EQ-05, EQ-06 pass in CI suites; npm run spec:coverage passes

## 8. Goal status

Blocked by: 1
A Goal's derived status (Reached, Projected or Beyond the N-year projection), with its month, months from today and progress, from one nominal Net Worth series. It returns data, not copy (D13).

- [ ] 8.1 Tests named GS-01, GS-02, GS-03, GS-04, GS-05 written and failing (red)
- [ ] 8.2 The status comes from the first point at or above the target, with today counting as Reached and Reached sticking after a dip (GS-01, GS-02, GS-03)
- [ ] 8.3 Progress is clamped to 0–1, including negative Net Worth (GS-04, GS-05)
- [ ] 8.4 Tests named GS-01, GS-02, GS-03, GS-04, GS-05 pass in CI suites; npm run spec:coverage passes

## Workflow follow-up

- Run `/opsx:verify redesign-calculations` once every ticket is done, then open the PR.
- The user runs `/opsx:archive` after merge.
