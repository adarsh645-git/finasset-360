Type: build
Status: ready-for-agent

# 08: Check-in mode

**What to build:** The monthly ritual the whole app is shaped around. The User starts a guided pass from the dashboard, choosing everything or only what's stale. Each step shows one Holding pre-filled with its last recorded value, so confirming an unchanged figure costs one keystroke — and confirming does **not** record a duplicate Valuation. One key accepts the Live Estimate. Progress reads "12 of 27". Esc leaves at any point, so an interrupted pass is not a trap. The pass ends with the Net Worth delta since the last check-in — the answer the User did the chore for.

Session rhythm this serves, from the User directly: 10–30 Valuations updated in a monthly pass, plus several distribution-only visits a month.

Spec: [`docs/SPEC.md`](../../../docs/SPEC.md) — user stories 39–46.

**Blocked by:** 06, 07.

- [ ] Start Check-in from the dashboard, choosing all or stale-only
- [ ] One Holding per step, pre-filled with its last recorded value
- [ ] Enter on an unchanged value advances **without recording a Valuation** — confirming must not pollute history with duplicate snapshots
- [ ] `L` accepts the Live Estimate for a live-priced Holding
- [ ] Progress indicator ("12 of 27")
- [ ] Esc leaves cleanly at any point
- [ ] The pass ends with the Net Worth delta since the last check-in
- [ ] Check-in suspends column browsing for a linear one-card-at-a-time queue
- [ ] Test: a pass where every value is confirmed unchanged records zero new Valuations and reports a delta of zero
