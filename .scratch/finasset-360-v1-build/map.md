# Map: FinAsset 360 v1 build

## Destination

A deployed, working FinAsset 360 v1, built from [`docs/SPEC.md`](../../docs/SPEC.md). The planning effort that produced that spec lives in [`.scratch/asset-tracker-spec/`](../asset-tracker-spec/map.md) and is closed — nothing here re-litigates it. Where a ticket states a decision, the originating planning ticket carries the derivation.

## Notes

- Domain vocabulary lives in [CONTEXT.md](../../CONTEXT.md); consult it before naming anything, and update it inline if a ticket sharpens or adds a term.
- ADRs in [`docs/adr/`](../../docs/adr/). **ADR 0004** (archive-not-delete) accepted while closing [06](issues/06-history-staleness-archival.md), after being raised and left open since the planning effort's schema ticket.
- **Two test seams only**, settled with the user 2026-09-08: the projection engine as a pure function (lands in [10](issues/10-projection-engine.md)), and the HTTP route boundary against a real Postgres with RLS enabled and two Users (stood up in [01](issues/01-sign-in-get-a-portfolio.md)). Not lowered to repository functions over a mocked DB — that would exercise zero lines of the RLS policies, and RLS *is* the tenancy guarantee.
- UI correctness is verified by hand at the user's own viewport. **Any UI verification claim must name the width it was made at** — agent browser tooling clamps to ~1288px while the user reviews at ~2000px.
- **Post-V1 improvements intake.** V1 is complete; further fixes and improvements the user reports are filed here as new ad hoc `Type: build` tickets (20 onward), one ticket per reported item, header `Type: build` with no `Status:` while open. Each notes it is "Not spec-derived — filed ad hoc," quotes the user's report, and flags any open decision to grill before building. Filing a ticket never builds it; the user picks what to take next. Precedent: 17, 18, 19.
- Tickets are tracer-bullet vertical slices, each sized for one fresh context window. Greenfield repo, so there was nothing to prefactor and no wide refactors.

## Frontier (takeable now)

_(none — 01–22 all resolved; 20–22 need a by-hand UI check, and 21's production cron/`price_cache` check is outstanding. A rate-limit follow-up for fetch-on-add is noted in 21's resolution, not yet filed.)_

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
| 19 | ["Held at" field on a Holding](issues/19-held-at-field.md) | — |
| 20 | [Select the new Holding after adding it](issues/20-select-new-holding-after-add.md) | — |
| 21 | [A newly added market-symbol Holding shows a price immediately](issues/21-price-for-newly-added-holding.md) | — *(pairs with 20)* |
| 22 | [Cash-shaped add/edit form](issues/22-cash-shaped-holding-form.md) | — |

## In progress

_(nothing claimed)_

## Done

- [01 · Sign in, get a Portfolio](issues/01-sign-in-get-a-portfolio.md) — Google sign-in, auto-created Portfolio, home currency; stands up the RLS + two-user test harness.
- [02 · Deploy the skeleton to Vercel](issues/02-deploy-the-skeleton.md) — first production deploy, against the real Supabase project.
- [03 · Asset Classes and Holdings in the Miller shell](issues/03-asset-classes-and-holdings.md) — default Asset Classes, Holdings, Miller-column navigation shell.
- [04 · Record a Valuation, see Net Worth](issues/04-record-a-valuation.md) — one-interaction Valuation entry, FX rate captured at record time, Net Worth headline.
- [05 · Liabilities, and Net Worth nets them](issues/05-liabilities.md) — Liability Classes and Liabilities mirror the asset side; Net Worth = Holdings − Liabilities.
- [06 · History, staleness, and archival](issues/06-history-staleness-archival.md) — Valuation History with sparkline, staleness dimming, archive-not-delete for sold Holdings.
- [07 · Live Estimates from a shared price cache](issues/07-live-estimates.md) — market-symbol Holdings show a Live Estimate, clearly distinct from a recorded Valuation.
- [08 · Check-in mode](issues/08-check-in-mode.md) — guided monthly pass over stale Holdings, ends with Net Worth delta.
- [09 · Target Allocation and the Plan page](issues/09-target-allocation-and-plan.md) — per-Asset-Class target percent, dashboard distribution bars with target tick, Plan breadcrumb root.
- [10 · Projection: growth, contribution, escalation](issues/10-projection-engine.md) — forward-looking projected Net Worth line; pure-function engine is test seam 1.
- [11 · Amortization Assumptions and payoff](issues/11-amortization-and-payoff.md) — optional loan amortization to payoff, capability-based on any Liability.
- [12 · Inflation — nominal and real, both charted](issues/12-inflation-nominal-and-real.md) — nominal and inflation-adjusted projection lines, forking at today.
- [13 · Target Net Worth and the gap](issues/13-target-net-worth.md) — named amount+date target drawn on the projection chart, gap reported date-first.
- [14 · Required Contribution solver](issues/14-required-contribution-solver.md) — required monthly contribution to hit the Target on its date, solved linearly.
- [15 · Narrow viewport](issues/15-narrow-viewport.md) — accordion outline with bottom-sheet detail below 900px, replacing Miller columns.
- [16 · Empty and first-run states](issues/16-empty-and-first-run-states.md) — first-run guidance for Portfolio, Net Worth, and Plan with nothing recorded yet.
- [17 · Google display name in the top strip](issues/17-google-display-name.md) — top strip shows the signed-in User's Google display name; dropped the dashboard's own branding line.
- [18 · Stock-picker autocomplete with sector](issues/18-stock-picker-autocomplete.md) — type-ahead symbol picker with ticker/name/Sector, Finnhub-backed. Ad hoc, not spec-derived.
- [19 · "Held at" field on a Holding](issues/19-held-at-field.md) — optional freeform `held_at` label so duplicate Holdings across brokerages don't overload `Name`. Ad hoc, not spec-derived.
- [20 · Select the new Holding after adding it](issues/20-select-new-holding-after-add.md) — adding a Holding selects it in the detail pane. By-hand UI check pending.
- [21 · A newly added market-symbol Holding shows a price immediately](issues/21-price-for-newly-added-holding.md) — fetch-on-add (option A) via shared `refreshPrice`. Prod cron check and rate-limit follow-up outstanding.
- [22 · Cash-shaped add/edit form](issues/22-cash-shaped-holding-form.md) — Cash hides Market symbol and Quantity; identified by fixed default class id. By-hand UI check pending.
