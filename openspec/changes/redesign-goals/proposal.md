# Proposal

## Why

The old app had one dated Target Net Worth and a Required Contribution solver. The redesign ([map #13](https://github.com/adarsh645-git/finasset-360/issues/13)) replaces them with any number of dateless Goals, each with a derived date ([#6](https://github.com/adarsh645-git/finasset-360/issues/6)). `redesign-calculations` already computes the Goal status and `redesign-data-model` already stores Goals. Nothing shows them yet: the Goals nav item is plain text, the Overview has no Goals card, and the chart draws no goal lines. This is the last change in the [nine-change sequence](https://github.com/adarsh645-git/finasset-360/issues/16), and it finishes the mockup.

## What Changes

- **`/goals` page ("Net worth milestones")** (README screen 9; prototype `goalInfo()`, `gl`, `gform`):
  - One card per Goal, sorted by target ascending. Each card has the name, the status, "⟨current⟩ of ⟨target⟩", a progress bar and Remove.
  - Status: "Reached ⟨Mon YYYY⟩" in green, "Projected ⟨Mon YYYY⟩ · in N yrs", or "Beyond the N-year projection". It comes from the calculations module's Goal status on the all-Countries nominal Net Worth series (recorded history, then the Projection including Monthly savings), with the User's horizon. View state never changes it.
  - Progress is today's Net Worth ÷ target, clamped to 0–100%. The bar turns green at 100%.
  - Subtitle: "Projected dates use the country-specific growth rates set on the Growth page, current loan payments and your monthly savings. Amounts are nominal." This is the savings-aware wording from [#19](https://github.com/adarsh645-git/finasset-360/issues/19).
  - An inline add form with a name and a $ target. The target must be > 0 after stripping `$`, commas and spaces. A blank name is stored blank (`redesign-data-model` D12) and shown everywhere as "⟨compact target⟩ net worth".
  - Remove is a real delete through the data-model's Goals delete route. There is no editing: remove and re-add.
  - Empty state: "No goals yet" above the add form.
- **Overview Goals card:** the next 3 unreached Goals (name, status, bar) and "All goals →". The card is hidden when there is no unreached Goal.
- **Goal lines on the Overview chart:** every Goal is passed to the chart's `goals` prop, labelled with its displayed name. The chart primitive from `redesign-shell-and-overview` already draws the nearby ones dotted and labelled (its CH-08 rule).
- **Nav and links:** `goals` joins the link registry's `EXISTING_ROUTES`, so the Goals nav item and "All goals →" become links. The nav shows the Goal count in the sidebar and the phone tab bar.
- Responsive behaviour ships here: the page column, the wrapping add form and 40px touch targets, checked by hand at ~2000px, ~800px and ~390px.

### Non-goals

- Editing a Goal in place, Goal dates, Goals in today's dollars, per-Country Goals and a "savings needed by year X" helper ([#6](https://github.com/adarsh645-git/finasset-360/issues/6) Out of scope).
- Goal status math. It belongs to `redesign-calculations` (`goal-status`), which this change only calls.
- The Goals table, its RLS and the create and delete routes. `redesign-data-model` owns them.
- Goal lines on any chart other than the Overview's.

## Capabilities

### New Capabilities

- `goals`: showing, adding and removing Goals. This covers the `/goals` page (status, progress, subtitle, empty state, add form, Remove), the Overview Goals card, the goal lines on the Overview chart, and the Goals nav item with its count.

### Modified Capabilities

None (`openspec/specs/` is empty). The Overview card, the chart lines and the nav count sit on surfaces owned by `overview`, `charts` and `app-shell` (`redesign-shell-and-overview`). As the shared brief requires, their requirements live under `goals`.

## Impact

- **Code:** a new Goals screen view-model (`src/lib/views/goals.ts`) with the page rows, the Overview card rows, the goal lines, the displayed name and the add-form parsing. The `/goals` page is a Server Component reading `loadPortfolio`, with a small client form and a Remove button that call the Goals routes and then `router.refresh()`. The Overview fills its Goals slot and the chart's `goals` prop. The shell view-model gets the Goals count, and `src/lib/views/links.ts` gets the `goals` route family.
- **APIs consumed:** `loadPortfolio` / `GET /api/portfolio` (Goals sorted by target, horizon, Monthly savings, Projection Assumptions), `POST /api/goals` and `DELETE /api/goals/[id]` from `redesign-data-model`. No route, schema or migration is added, so there is no production `db push`.
- **Tests:** Vitest view-model and `renderToStaticMarkup` tests under `tests/unit/`, named by GO scenario ID and gated by `npm run spec:coverage`. The delete itself is proven by the data-model's DM-35 route test.
- **Dependencies:** none added.
- **Docs:** none. CONTEXT.md's Goal entry already matches. No new glossary terms.
