Type: spec
Status: ready-for-agent

## Question

Build FinAsset 360 v1 from scratch, per the full product spec at [`docs/SPEC.md`](../../../docs/SPEC.md).

The spec is the deliverable of this effort's whole planning arc — it synthesises every resolved ticket (01–04, 06–08, 10–13) plus [CONTEXT.md](../../../CONTEXT.md) and ADRs [0001](../../../docs/adr/0001-multi-tenant-open-signup.md)/[0002](../../../docs/adr/0002-stack-choice.md)/[0003](../../../docs/adr/0003-valuation-snapshots-not-ledger.md) into a single hand-off document. Nothing in it is newly decided; where it states a decision, the originating ticket carries the derivation.

## Test seams (settled with the user, 2026-09-08)

**Two seams, deliberately — no third.**

1. **The projection engine, as a pure function.** One module, plain data in and out, no I/O. Everything from tickets 04, 07, 11, 12 and 13 lives behind this one call. The oracle already exists: ticket 12's month-by-month simulation cross-check (agreement to 1×10⁻⁷ across 21 segments) and ticket 13's linearity check are independent reference computations, not snapshots of the code's own output, and should be carried into the suite in that spirit.
2. **The HTTP route boundary against a real Postgres.** Local Supabase with RLS *enabled* and two distinct authenticated Users. Not lowered to repository functions over a mocked DB — that would exercise zero lines of the RLS policies, and RLS is the tenancy guarantee from ADR 0001. A suite that passes with every policy dropped would be worse than none.

UI correctness is verified by hand at the user's own viewport, consistent with how every prototype in this effort was reviewed. Any UI verification claim must name the width it was made at (see the 1288px-vs-2000px hazard in the spec).

## Broken down into tickets

The spec was sliced into 16 tracer-bullet tickets on 2026-09-08, approved by the user: [`.scratch/finasset-360-v1-build/`](../../finasset-360-v1-build/map.md). Frontier is [01 · Sign in, get a Portfolio](../../finasset-360-v1-build/issues/01-sign-in-get-a-portfolio.md), which has no blockers and stands up both test harnesses. Deploy is sequenced **second**, not last, so the first production deploy debugs one screen rather than sixteen tickets at once.

## Blocked on

[Provision Supabase](05-provision-supabase.md) — human-only. The build can proceed against a local Supabase, but cannot deploy without it.

## Carried forward for this session to decide

Listed in the spec under "Left to the build session's judgement": narrow-outline state persistence, the bottom sheet's dismissal gesture, whether the Plan page needs sectioning now its inputs have doubled, empty/first-run states (never prototyped), and the unarchive path. Plus one standing offer: **ADR 0004 for the archive-not-delete rule**, raised on ticket 03 and not yet taken up.
