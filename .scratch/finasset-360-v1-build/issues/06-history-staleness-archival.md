Type: build
Status: resolved

# 06: History, staleness, and archival

**What to build:** The accumulated record becomes visible and useful. A Holding's detail panel shows its Valuation History as a table with a sparkline. The dashboard gains a recorded Net Worth timeline built from that history. Anything older than 30 days is visibly dimmed in the browser and listed on the dashboard, so the User knows what to update without hunting. And a sold Holding is **archived**, not deleted — gone from today's figures, still present in the trend for the period it was owned.

The archival rule is a correctness requirement, not tidiness: a hard delete would retroactively erase that Holding's contribution to *past* distribution, not only to today's.

Spec: [`docs/SPEC.md`](../../../docs/SPEC.md) — user stories 18–21, 27, 29–31, 55.

**Blocked by:** 04.

- [x] Valuation History table plus sparkline in the detail panel
- [x] Recorded Net Worth timeline on the dashboard, from Valuation History
- [x] Valuations older than 30 days are dimmed in the browser rows
- [x] Dashboard staleness list of everything older than 30 days, linking back into the tree
- [x] Days-since is shown where a Valuation appears
- [x] The "remove" action sets `archived_at`; it is the primary removal path in the UI
- [x] Current Net Worth and distribution filter `WHERE archived_at IS NULL`; historical and trend queries ignore the filter entirely
- [x] A true `DELETE` exists for correcting a mistaken entry and is **not** the primary remove action
- [x] Deleting an Asset Class is refused while archived Holdings still reference it (they need their class for historical grouping)
- [x] Test: archiving removes a Holding from current Net Worth and distribution **while leaving it in historical trend queries** — the property the rule exists for
- [x] Test: the timeline handles a Holding with a single Valuation without breaking
- [x] **Offer ADR 0004 for the archive-not-delete rule.** It is hard to reverse once data exists, surprising without context (a future reader would likely "clean up" `archived_at` toward a simpler hard delete), and the result of a real trade-off. Offered once on the schema ticket and not yet taken up — raise it rather than leaving it implicit.

**Resolved:** `archived_at timestamptz null` added to `holding` and `liability` (migration `20260912164721_archive_holding_and_liability.sql`). `POST /api/holdings/[id]/archive` and `POST /api/liabilities/[id]/archive` are the new primary removal actions; the existing `DELETE` routes are unchanged and now demoted to a secondary "Delete permanently" affordance behind a click-to-confirm in the detail panels. `GET /api/holdings`/`GET /api/liabilities` now filter `archived_at IS NULL`. `src/lib/net-worth/timeline.ts` (`buildNetWorthTimeline`) builds the recorded Net Worth trend from *every* Holding/Liability including archived ones, forward-filling each owner's latest Valuation and cutting it off at its own `archived_at` date — the property that lets an archived row still count for the period it was owned while dropping out of current Net Worth (which PortfolioShell computes from active owners only). `src/lib/valuations/staleness.ts` (`daysSince`/`isStale`/`daysAgoLabel`, 30-day threshold) is the single place age-phrasing and staleness live, used by Miller rows (day-count shown on every Valuation, not only stale ones), `ValuationEditor`'s as-of label, `ValuationHistoryTable`, and the new dashboard `StalenessList`. New presentational components: `Sparkline` (a plain SVG polyline, no charting library, consistent with this app's monochrome visual system), `ValuationHistoryTable`, `NetWorthTimelineChart`, `StalenessList`.

Verified: `npm test` (13 files, 115 passing — 6 new route-boundary tests in `tests/route/archival.test.ts` covering archive RLS/ownership and the archived-Holding-still-blocks-Asset-Class-deletion FK case, plus new pure-function unit tests in `tests/unit/staleness.test.ts` and `tests/unit/net-worth-timeline.test.ts`), a clean `npm run typecheck`, a clean `npm run lint`, and a clean `next build`. **Not agent-verified in a browser** — this project's local stack has no Google OAuth client configured, so an interactive session can't be reached; UI is verified by hand at the user's own viewport per this build's established convention.

Reviewed via `/code-review` (Standards + Spec sub-agents in parallel). Both surfaced real, fixed issues:
- Standards caught the "days ago" phrasing written three inconsistent ways (one handled singular/plural, two didn't — `StalenessList`/`ValuationEditor` would have shown "1 days ago"); extracted to one `daysAgoLabel` in `staleness.ts` and used everywhere. Also flagged the two new `history` filters in `PortfolioShell.tsx` as the only unmemoized derived arrays in a file where every sibling derivation is `useMemo`'d — memoized to match.
- Spec caught that the Miller-row day-count was only shown once a Valuation was already stale, not on every Valuation as the checklist literally asks ("Days-since is shown where a Valuation appears") — now always shown, dimmed styling still reserved for the stale case.
- Spec also noted the "archiving excludes from current Net Worth, not from historical" property is exercised as a pure-function unit test (`buildNetWorthTimeline` + `computeNetWorth`) and via the route boundary for the GET-listing and FK-restrict angles, but not through an integration test driving `PortfolioShell`'s own React filtering logic end-to-end — no test seam for that exists anywhere else in this codebase either (component-level UI logic has never been under automated test here), so this is a pre-existing gap, not one introduced by this ticket; left as-is rather than inventing new test infrastructure outside the two settled seams.

**ADR 0004 offered, not yet taken up as of this ticket's close** — see this repo's `docs/adr/` and the note below; the build session should ask the user directly rather than deciding unilaterally.
