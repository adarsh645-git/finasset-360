Type: build
Status: resolved

# 18: Stock-picker autocomplete with sector

**What to build:** Replace the freeform "Market symbol" text input in `AddHoldingRow.tsx` and `HoldingDetailPanel.tsx` with a type-ahead picker — type a company name or ticker, get suggestions showing the ticker, company name, and (once resolved) its Sector, the same shape as Yahoo Finance's or Robinhood's search box.

Not spec-derived — filed ad hoc from a user request ("typing in the name of the holding in Equity is not sustainable... behave similar to how Yahoo Finance, Robinhood work"), grilled via `/wayfinder` in this session rather than drawn from `docs/SPEC.md`. Three research passes confirmed the shape below against Finnhub's actual free-tier docs (not assumed).

**Architecture, settled this session:**

- **No live external call per keystroke.** Finnhub's free tier has a bulk `/stock/symbol?exchange=US` endpoint returning the full US symbol list (tens of thousands of rows: symbol, company name, type) in one call — the same shared 60 calls/min budget as `/quote`, but one call covers the whole exchange. A new **weekly** Vercel Cron route (mirroring `src/app/api/cron/refresh-prices/route.ts`'s pattern exactly: `CRON_SECRET`-protected, service-role upsert) pulls this into a new shared, non-tenant-scoped `stock_symbol` table (`symbol` pk, `name`, `type`, `sector` nullable, `updated_at`) — RLS enabled, `FOR SELECT TO authenticated USING (true)`, writable only via the service-role key, same shape as `price_cache`. The autocomplete then queries this **local** table (prefix/substring match on symbol and name) — zero external calls per keystroke, no debounce/rate-limit tuning needed.
- **Sector is fetched lazily, once per symbol, not per keystroke.** Finnhub's free-tier `/stock/profile2` has no real GICS sector field, only a coarse `finnhubIndustry` string (sometimes blank) — accepted as good enough since Sector is a display-only annotation here, not a projection input. On first selection of a symbol that has no cached sector yet, a server route calls `/stock/profile2`, writes the result into `stock_symbol.sector`, and copies it onto the new Holding. Cached indefinitely afterward — no refresh job, since a company's sector essentially never changes.
- **Scope: US equities/ETFs only.** Matches the boundary Finnhub's `/quote` already has for Live Estimates (ticket 07) — this isn't a new gap. Non-US Holdings (metals already use their fixed XAU/XAG/XPT/XPD set; anything else, including a future Indian equity) get no suggestions and no Sector — freeform entry only, same as today.
- **India (NSE/BSE) confirmed out of scope here, and it's a real gap worth flagging rather than solving.** Finnhub's bulk symbol list for `NS`/`BO` exchanges is a paid add-on ($49.99+/mo), and real-time international quotes are Enterprise-only per Finnhub's own docs — so Indian equities today have no Live Estimate at all, autocomplete or not. The user confirmed real future interest in India but no current Indian holdings. Revisiting it means reopening ticket 07's Finnhub choice for a second provider (e.g. the unofficial `yfinance`, no key required, `.NS`/`.BO` suffixed tickers, no SLA) — a separate future ticket, not scoped here.

**Blocked by:** none — reuses the price-cache/cron pattern from ticket 07 and touches the same two components as ticket 03, both already built.

- [x] Migration: `stock_symbol` table (`symbol` text pk, `name` text, `type` text, `sector` text null, `updated_at` timestamptz), RLS `FOR SELECT TO authenticated USING (true)`, no client write policy
- [x] Migration: `holding.sector text null` column
- [x] New weekly Vercel Cron route pulling Finnhub's `/stock/symbol?exchange=US` into `stock_symbol` (upsert on symbol/name/type; never touches `sector`); add its schedule to `vercel.json`
- [x] Server route: given a symbol, return its cached `sector` if present, else call Finnhub `/stock/profile2`, cache the `finnhubIndustry` result onto `stock_symbol.sector`, and return it (a blank/missing industry from Finnhub is a valid cached result, not an error to retry every time)
- [x] Autocomplete component (shared by both entry points) querying `stock_symbol` locally by symbol/name prefix or substring — no external call in the request path
- [x] Wired into `AddHoldingRow.tsx`'s "Market symbol (optional)" field
- [x] Wired into `HoldingDetailPanel.tsx`'s "Market symbol" field
- [x] Selecting a suggestion fills the symbol field, triggers the lazy sector fetch, and **autofills the Holding's Name field** with the company name — Name stays editable afterward for a custom label (e.g. "Apple — Fidelity 401k")
- [x] No selection still allows saving a freeform symbol/name with no match, consistent with today's tolerance for an unverified `price_lookup_symbol`
- [x] Dropdown follows ticket 15's touch-affordance conventions below 900px (44px targets, no hover-only affordance)
- [x] `CONTEXT.md`'s new **Sector** term (added this session) matches what ships
