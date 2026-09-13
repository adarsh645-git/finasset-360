Type: build
Status: resolved

# 08: Check-in mode

**What to build:** The monthly ritual the whole app is shaped around. The User starts a guided pass from the dashboard, choosing everything or only what's stale. Each step shows one Holding pre-filled with its last recorded value, so confirming an unchanged figure costs one keystroke — and confirming does **not** record a duplicate Valuation. One key accepts the Live Estimate. Progress reads "12 of 27". Esc leaves at any point, so an interrupted pass is not a trap. The pass ends with the Net Worth delta since the last check-in — the answer the User did the chore for.

Session rhythm this serves, from the User directly: 10–30 Valuations updated in a monthly pass, plus several distribution-only visits a month.

Spec: [`docs/SPEC.md`](../../../docs/SPEC.md) — user stories 39–46.

**Blocked by:** 06, 07.

- [x] Start Check-in from the dashboard, choosing all or stale-only
- [x] One Holding per step, pre-filled with its last recorded value
- [x] Enter on an unchanged value advances **without recording a Valuation** — confirming must not pollute history with duplicate snapshots
- [x] `L` accepts the Live Estimate for a live-priced Holding
- [x] Progress indicator ("12 of 27")
- [x] Esc leaves cleanly at any point
- [x] The pass ends with the Net Worth delta since the last check-in — persisted in a new append-only `check_in` table (server-computed Net Worth, never client-supplied), since nothing else in the schema tracked "when was the last check-in"
- [x] Check-in suspends column browsing for a linear one-card-at-a-time queue — the breadcrumb is hidden too, not just inert, while a pass is active
- [x] Test: a pass where every value is confirmed unchanged records zero new Valuations and reports a delta of zero (tests/route/check-in.test.ts)
