# Archive, don't delete, a removed Holding or Liability

The normal "remove" action on a Holding or Liability sets `archived_at` rather than deleting the row (see CONTEXT.md's Valuation entry and ADR 0003). Current Net Worth and current distribution filter `WHERE archived_at IS NULL`; historical and trend queries — the recorded Net Worth timeline, distribution-over-time — ignore that filter entirely and read every Valuation regardless of archival state. A true `DELETE` still exists, cascading the row's Valuations, but is demoted to a secondary "Delete permanently" action for correcting a mistaken entry, not the primary removal path.

This is a correctness requirement, not tidiness: a hard delete on a sold Holding would retroactively erase its contribution to *past* distribution and Net Worth, not only to today's — the trend for the period it was genuinely owned would silently rewrite itself.

The trade-off this accepts: every current-state query in the app must remember to filter `archived_at IS NULL`, and a future reader unfamiliar with this rule could reasonably "clean up" the column toward a simpler hard delete, silently reintroducing the bug this ADR exists to prevent. `archived_at` is a narrowly-scoped status flag serving this one feature requirement — not a reintroduction of the audit-trail/soft-delete complexity ADR 0003 already ruled out elsewhere in the schema.

## Status

accepted
