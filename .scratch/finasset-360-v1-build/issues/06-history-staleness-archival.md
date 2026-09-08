Type: build
Status: ready-for-agent

# 06: History, staleness, and archival

**What to build:** The accumulated record becomes visible and useful. A Holding's detail panel shows its Valuation History as a table with a sparkline. The dashboard gains a recorded Net Worth timeline built from that history. Anything older than 30 days is visibly dimmed in the browser and listed on the dashboard, so the User knows what to update without hunting. And a sold Holding is **archived**, not deleted — gone from today's figures, still present in the trend for the period it was owned.

The archival rule is a correctness requirement, not tidiness: a hard delete would retroactively erase that Holding's contribution to *past* distribution, not only to today's.

Spec: [`docs/SPEC.md`](../../../docs/SPEC.md) — user stories 18–21, 27, 29–31, 55.

**Blocked by:** 04.

- [ ] Valuation History table plus sparkline in the detail panel
- [ ] Recorded Net Worth timeline on the dashboard, from Valuation History
- [ ] Valuations older than 30 days are dimmed in the browser rows
- [ ] Dashboard staleness list of everything older than 30 days, linking back into the tree
- [ ] Days-since is shown where a Valuation appears
- [ ] The "remove" action sets `archived_at`; it is the primary removal path in the UI
- [ ] Current Net Worth and distribution filter `WHERE archived_at IS NULL`; historical and trend queries ignore the filter entirely
- [ ] A true `DELETE` exists for correcting a mistaken entry and is **not** the primary remove action
- [ ] Deleting an Asset Class is refused while archived Holdings still reference it (they need their class for historical grouping)
- [ ] Test: archiving removes a Holding from current Net Worth and distribution **while leaving it in historical trend queries** — the property the rule exists for
- [ ] Test: the timeline handles a Holding with a single Valuation without breaking
- [ ] **Offer ADR 0004 for the archive-not-delete rule.** It is hard to reverse once data exists, surprising without context (a future reader would likely "clean up" `archived_at` toward a simpler hard delete), and the result of a real trade-off. Offered once on the schema ticket and not yet taken up — raise it rather than leaving it implicit.
