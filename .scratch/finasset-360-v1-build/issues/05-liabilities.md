Type: build
Status: resolved

# 05: Liabilities, and Net Worth nets them

**What to build:** The debt side, mirroring the asset side so there is no second mental model. Liability Classes with global defaults and custom additions; Liabilities as their own top-level branch grouped by class; balances recorded exactly the way Holding values are. Net Worth becomes Holdings minus Liabilities.

Liability Class is a **separate table** from Asset Class, not one table with a discriminator — that would let a foreign key point a Holding at a Liability Class, or need a trigger to prevent it.

Spec: [`docs/SPEC.md`](../../../docs/SPEC.md) — user stories 8, 16, 28, 48, 56.

**Blocked by:** 04.

- [x] Global default Liability Classes plus custom ones, same ownership and RLS rules as Asset Class
- [x] `liability_class` is its own table, identical in shape to `asset_class`, not a discriminated variant of it
- [x] Add, edit and delete a Liability: name, Liability Class, currency
- [x] Liabilities are their own top-level branch in the Miller columns, grouped by Liability Class, with class icons and the same neutral-glyph fallback
- [x] `liability_valuation` is its own table mirroring `holding_valuation` (a plain FK cannot target one of two tables; a polymorphic pair would surrender referential integrity)
- [x] Recording a Liability balance works identically to recording a Holding value, including backdating and one-per-day
- [x] Net Worth headline reads Holdings − Liabilities with the breakdown visible
- [x] Deleting a Liability Class that still has Liabilities is refused
- [x] Test: User A cannot read or write User B's Liabilities or their Valuations
- [x] Test: Net Worth nets correctly across a multi-currency mix of Holdings and Liabilities

**Resolved:** all criteria verified against the local Supabase harness (`npm test`, 95/95 passing, including 33 new route-boundary tests across `tests/route/liability-classes.test.ts`, `liabilities.test.ts`, and `liability-valuations.test.ts` covering the RLS/ownership/one-per-day/backdating/FK-restrict cases above, plus new/extended pure-function unit tests in `tests/unit/net-worth.test.ts` and `latest-valuation.test.ts`), a clean `npm run typecheck` / `npm run lint`, and a clean `next build`. Reviewed via `/code-review` (Standards + Spec sub-agents in parallel): both came back clean, no hard violations, no missing checklist items, no scope creep from tickets 06–16.

The Liability side is a file-by-file mirror of the Asset side (`liability_class`/`liability`/`liability_valuation` tables, matching migrations, matching API routes, matching RLS policy shapes, matching `Add*Row`/`*DetailPanel` components), per the domain's own rule that the two are deliberately separate, not a shared discriminated abstraction. Global default Liability Classes are Mortgage, Auto Loan, and Credit Card (CONTEXT.md's own examples for the term). `ValuationEditor` is reused as-is for both Holdings and Liabilities — it was narrowed to a structural `{ amount, recorded_at }` type rather than duplicated, since it never read anything Holding-specific to begin with.

Two judgment calls the review surfaced, not disclosed anywhere else:
1. `src/lib/fx/rate.ts`'s last-known-rate fallback (used when the live FX API is unreachable) now checks both `holding_valuation` and `liability_valuation` history and picks whichever is more recent — a Liability's currency may never have appeared on a Holding, so the ticket 04 fallback alone wasn't enough for "recording a Liability balance works identically to recording a Holding's value."
2. Column 1's label changed from "Asset Classes" to "Portfolio", since it now also hosts the "Liabilities" sentinel row (`LIABILITIES_ROOT_ID`) as a sibling of the Asset Classes — a plain string sentinel sharing the same `selectedClassId` state slot as a real Asset Class id, distinguished only by not being a uuid. Flagged by the Standards review as a reasonable, well-commented trade-off rather than a proper discriminated union — worth reconsidering if a third top-level branch is ever added.

Not built, matching ticket 05's own scope: Amortization Assumptions and `linked_holding_id` (ticket 11), archival (ticket 06 — deletion here is a true delete, mirroring Holding's own ticket-03/04 state), Live Estimates, Target Allocation, and Projection. The Liabilities branch UI (Miller columns, icons, detail panels) is implemented but **not agent-verified in a browser**, per this build's own "verified by hand at the user's viewport" convention.
