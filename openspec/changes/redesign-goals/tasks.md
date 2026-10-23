# Tasks

## 1. Goals page with status and progress, and the Goals nav

Blocked by: none
A signed-in User opens `/goals` from the nav (now a link, with the Goal count) and sees "Net worth milestones", the savings-aware subtitle, and one card per Goal sorted by target. Each card shows the displayed name, the derived status, "current of target" and a progress bar, or "No goals yet" when there are none (D1–D5, D11, D12). Goals come from `npm run seed` until ticket 2 lands.

- [x] 1.1 Tests named GO-01, GO-02, GO-03, GO-05, GO-06, GO-07, GO-08, GO-09, GO-11, GO-17 written and failing (red)
- [x] 1.2 `goals` joins `EXISTING_ROUTES` in the link registry, so the Goals nav item links to `/goals` in the sidebar, tablet tabs and phone tab bar, and `buildShell` gives it the Goal count, "0" included (GO-17)
- [x] 1.3 `goalRows` builds one all-Countries nominal Net Worth series (history, then the Projection with Monthly savings over the horizon) and calls calc's Goal status helper for each Goal, taking no view state (GO-02, GO-03, GO-05)
- [x] 1.4 Status, progress and bar copy and colours follow D3 through the shared formatting helpers, with Reached sticking after a dip (GO-06, GO-07)
- [x] 1.5 `displayName` shows a blank name as "⟨compact target⟩ net worth" and trims the rest (GO-11)
- [x] 1.6 The page shows the heading, the subtitle, cards in target order, and "No goals yet" with no Goals (GO-01, GO-08, GO-09)
- [x] 1.7 Tests named GO-01, GO-02, GO-03, GO-05, GO-06, GO-07, GO-08, GO-09, GO-11, GO-17 pass in CI suites; npm run spec:coverage passes
- [ ] 1.8 Checked by hand against the mockup's Goals screen and the nav at 2000px, 800px and 390px

## 2. Add and remove Goals

Blocked by: 1
The User adds a Goal from the inline form (name + $ target; Enter or "Add goal") and it appears in its sorted place. A bad target saves nothing and keeps the text. Remove deletes a Goal for good, with no edit control (D6–D8).

- [x] 2.1 Tests named GO-10, GO-12 written and failing (red)
- [x] 2.2 `parseGoalTarget` strips `$`, commas and spaces and accepts only finite numbers > 0 (GO-10)
- [x] 2.3 The form posts the trimmed name (or none) and the target to `POST /api/goals`, then clears and refreshes. A failed request shows the route's message under the form
- [x] 2.4 Each card offers Remove, which calls `DELETE /api/goals/[id]` and refreshes, and no edit control (GO-12)
- [x] 2.5 Tests named GO-10, GO-12 pass in CI suites; npm run spec:coverage passes
- [ ] 2.6 Checked by hand at 2000px, 800px and 390px: the form wraps, Enter adds, Remove and inputs meet 40px touch targets on phone, and a removed Goal also leaves the nav count

## 3. Overview Goals card and goal lines

Blocked by: 1
The Overview's Goals slot shows the next 3 unreached Goals with "All goals →", or nothing when none is unreached. The Overview chart is given every Goal as a labelled goal line and draws the nearby ones dotted (D9, D10).

- [ ] 3.1 Tests named GO-04, GO-13, GO-14, GO-15, GO-16 written and failing (red)
- [ ] 3.2 `buildOverview` returns the Goals card from `goalRows`: the first 3 not Reached, in target order, with "All goals →" to `/goals`, or null (GO-04, GO-13, GO-14)
- [ ] 3.3 `buildOverview`'s chart `goals` prop carries every Goal's target and displayed name, and the rendered chart shows a nearby line and omits a distant one (GO-15, GO-16)
- [ ] 3.4 Tests named GO-04, GO-13, GO-14, GO-15, GO-16 pass in CI suites; npm run spec:coverage passes
- [ ] 3.5 Checked by hand against the mockup's Overview at 2000px, 800px and 390px, with the projection on and off

## Workflow follow-up

- Run `/opsx:verify redesign-goals` once every ticket is done, then open the PR.
- The user runs `/opsx:archive` after merge.
