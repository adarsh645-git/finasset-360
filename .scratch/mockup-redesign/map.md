> Snapshot of [Map: Mockup redesign](https://github.com/adarsh645-git/finasset-360/issues/13), exported 2026-10-13. The GitHub issue is canonical; this copy can lag behind it.

# Map: Mockup redesign

## Destination

An **ordered sequence of OpenSpec changes** (skills-driven schema), each ready for `/opsx:propose` and shippable on its own, that together make FinAsset 360 look and work like the [design handoff](https://github.com/adarsh645-git/finasset-360/blob/main/docs/design/portfolio-tracker/README.md) (prototype [`Portfolio Tracker.dc.html`](https://github.com/adarsh645-git/finasset-360/blob/main/docs/design/portfolio-tracker/Portfolio%20Tracker.dc.html), layout A). That covers the sidebar shell; the Overview, Assets, class, detail, Liabilities, loan, Growth and Goals pages; the position drawer; the add/edit modal; and the phone/tablet/desktop behaviour. The handoff is this closed map: each resolved decision becomes an entry in the matching change's `design.md`.

## Notes

- **Planning only** (re-charted 2026-10-13). Tickets resolve decisions. Building happens in the OpenSpec changes, never on this map.
- **The mockup is the authority.** Where it conflicts with the current domain model or `docs/SPEC.md`, the mockup wins. Only genuine open questions get a ticket: where the mockup is silent or ambiguous, or where it drops a current feature the user may still want.
- **Start fresh.** Production holds only test data, so the new schema is designed from scratch, with no data migration and no compatibility with the old tables.
- **Settled at charting, don't re-litigate** (2026-10-07, still standing):
  - **Country** is a data-driven concept (US and IN initially) that fixes native currency and carries its own Projection rates. Everything rolls up to **USD**.
  - **Real App Router routes**: `/`, `/assets`, `/assets/[class]`, `/holdings/[id]`, `/liabilities`, `/liabilities/[id]`, `/growth`, `/goals`. The position drawer and the add/edit modal are search-param state.
  - **The mockup's tokens replace the current palette** as Tailwind v4 `@theme` variables. Light/dark is a toggle persisted in a cookie (no flash on server render).
  - **Charts use one shared hand-rolled SVG primitive** (axes, series, projection split, crosshair tooltip, touch). No chart library.
  - **Re-homed or decided per feature:** sign-in chrome (name, Sign out) is re-homed. Archive-not-delete ([ADR 0004](https://github.com/adarsh645-git/finasset-360/blob/main/docs/adr/0004-archive-not-delete.md)) stays under the surface: the mockup's "Delete (click twice)" archives. "Held at" is dropped, since an account's name is where it's held.
- **Schema detail** (tables, columns, RLS) is designed in the data-model change's `design.md`, not here. The map settles the domain decisions it rests on.
- **Verification** (for the changes): the user verifies UI by hand against the matching mockup screen at their ~2000px viewport, plus phone and tablet widths. Every verification claim names its width.
- **Remote Supabase migrations are not applied by the deploy pipeline.** The data-model change must apply its migration to production explicitly.
- Domain vocabulary is in [CONTEXT.md](https://github.com/adarsh645-git/finasset-360/blob/main/CONTEXT.md). Update it inline whenever a ticket changes a term; this redesign will change several (Holding, Valuation, Live Estimate, Liability, Target Net Worth, Net Worth's currency).
- Facts gathered at charting: FX comes from Frankfurter (ECB rates, `src/lib/fx/rate.ts`), which also serves historical series. Charts are hand-rolled SVG (`NetWorthTimelineChart`, `Sparkline`). Styling is Tailwind v4 with Geist already wired. `stock_symbol` is US-only (Finnhub).
- **Tracker**: this issue is the map, and its sub-issues are the tickets (`wayfinder:<type>` label). Blocking uses GitHub's native *blocked by*. A session claims a ticket by assigning it before any work. A ticket resolves with a resolution comment, then it's closed and a context pointer is added to *Decisions so far* here.

## Decisions so far

- [Market data for Indian tickers, exchange and company name](https://github.com/adarsh645-git/finasset-360/issues/9): no free licence-clean NSE source. Store Finnhub's US exchange (`mic`) now. Indian tickers go manual (name via Finnhub `/search`) unless a paid feed is chosen in [Indian stock prices: entered by hand, or a paid feed?](https://github.com/adarsh645-git/finasset-360/issues/12).

## Not yet specified

- **Empty and first-run states** for the new pages (the mockup always has sample data). This may fold into the change split, or may need its own design question once the page set is fixed.

## Out of scope

- **Build slices on this map:** [Design tokens, theme toggle, and the sidebar shell](https://github.com/adarsh645-git/finasset-360/issues/10) and [Shared SVG chart primitive](https://github.com/adarsh645-git/finasset-360/issues/11). Closed when the map became planning only. Their content moves into the OpenSpec changes.
- **Migrating production data.** It's test data only, so we start fresh.
- **Countries beyond US and India.** The model is data-driven, but adding more is a future effort.
- **An FX depreciation assumption** (the mockup's "future option"). FX is held flat in projections, as in the mockup.
- **Full-US-market price load.** That's the separate us-market-prices map (local `.scratch/us-market-prices/map.md`).

