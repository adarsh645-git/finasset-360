# Map: FinAsset 360 v1 build

## Destination

A deployed, working FinAsset 360 v1, built from [`docs/SPEC.md`](../../docs/SPEC.md). The planning effort that produced that spec lives in [`.scratch/asset-tracker-spec/`](../asset-tracker-spec/map.md) and is closed — nothing here re-litigates it. Where a ticket states a decision, the originating planning ticket carries the derivation.

## Notes

- Domain vocabulary lives in [CONTEXT.md](../../CONTEXT.md); consult it before naming anything, and update it inline if a ticket sharpens or adds a term.
- ADRs in [`docs/adr/`](../../docs/adr/). **ADR 0004** (archive-not-delete) accepted while closing [06](issues/06-history-staleness-archival.md), after being raised and left open since the planning effort's schema ticket.
- **Two test seams only**, settled with the user 2026-09-08: the projection engine as a pure function (lands in [10](issues/10-projection-engine.md)), and the HTTP route boundary against a real Postgres with RLS enabled and two Users (stood up in [01](issues/01-sign-in-get-a-portfolio.md)). Not lowered to repository functions over a mocked DB — that would exercise zero lines of the RLS policies, and RLS *is* the tenancy guarantee.
- UI correctness is verified by hand at the user's own viewport. **Any UI verification claim must name the width it was made at** — agent browser tooling clamps to ~1288px while the user reviews at ~2000px.
- Tickets are tracer-bullet vertical slices, each sized for one fresh context window. Greenfield repo, so there was nothing to prefactor and no wide refactors.

## Frontier (takeable now)

- [01 · Sign in, get a Portfolio](issues/01-sign-in-get-a-portfolio.md) — no blockers. Also stands up both test harnesses.
- [18 · Stock-picker autocomplete with sector](issues/18-stock-picker-autocomplete.md) — no blockers; reuses the price-cache/cron pattern from 07 and touches the same components as 03, both already built. Not spec-derived — filed ad hoc from a user request, grilled via `/wayfinder` (2026-09-13). India (NSE/BSE) confirmed as a real future interest but out of scope here — Finnhub's free tier gates it behind a paid add-on; flagged for a future ticket, not this one.

## Dependency order

```
01 ──┬── 02 (also needs HITL: provision Supabase)
     └── 03 ── 04 ──┬── 05 ──┐
                    ├── 06 ──┼── 10 ──┬── 11
                    ├── 07 ──┘        └── 12 ── 13 ── 14
                    └── 09 ───────────┘
              06,07 ── 08 ──┐
                    09 ─────┴── 15
                 09,10 ─────── 16
```

| # | Ticket | Blocked by |
|---|---|---|
| 01 | [Sign in, get a Portfolio](issues/01-sign-in-get-a-portfolio.md) | — |
| 02 | [Deploy the skeleton to Vercel](issues/02-deploy-the-skeleton.md) | 01, *provision Supabase (HITL)* |
| 03 | [Asset Classes and Holdings in the Miller shell](issues/03-asset-classes-and-holdings.md) | 01 |
| 04 | [Record a Valuation, see Net Worth](issues/04-record-a-valuation.md) | 03 |
| 05 | [Liabilities, and Net Worth nets them](issues/05-liabilities.md) | 04 |
| 06 | [History, staleness, and archival](issues/06-history-staleness-archival.md) | 04 |
| 07 | [Live Estimates from a shared price cache](issues/07-live-estimates.md) | 04 |
| 08 | [Check-in mode](issues/08-check-in-mode.md) | 06, 07 |
| 09 | [Target Allocation and the Plan page](issues/09-target-allocation-and-plan.md) | 04 |
| 10 | [Projection: growth, contribution, escalation](issues/10-projection-engine.md) | 05, 06, 09 |
| 11 | [Amortization Assumptions and payoff](issues/11-amortization-and-payoff.md) | 10 |
| 12 | [Inflation — nominal and real, both charted](issues/12-inflation-nominal-and-real.md) | 10 |
| 13 | [Target Net Worth and the gap](issues/13-target-net-worth.md) | 12 |
| 14 | [Required Contribution solver](issues/14-required-contribution-solver.md) | 13 |
| 15 | [Narrow viewport](issues/15-narrow-viewport.md) | 08, 09 |
| 16 | [Empty and first-run states](issues/16-empty-and-first-run-states.md) | 09, 10 |
| 17 | [Google display name](issues/17-google-display-name.md) | — |
| 18 | [Stock-picker autocomplete with sector](issues/18-stock-picker-autocomplete.md) | — |

## In progress

_(nothing claimed)_

## Done

_(nothing yet)_
