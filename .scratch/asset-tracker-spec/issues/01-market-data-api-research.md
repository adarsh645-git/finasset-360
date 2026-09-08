Type: research
Status: resolved

## Question

Which free-tier API(s) should FinAsset 360 use for live price lookups?

Two sub-questions in one investigation:
- **Stocks/ETFs**: which provider offers a genuinely free tier reliable enough for a low-traffic personal/small-multi-tenant app (rate limits, uptime, ease of integration from a Next.js/Vercel serverless function)? Candidates to check: Alpha Vantage, Finnhub, Twelve Data, IEX Cloud, or others found during research.
- **Gold/precious metals**: which provider offers spot prices on a free tier (e.g. metals-api, GoldAPI, or others found during research)?

Recommend a specific choice (or one provider covering both, if one exists) with rate limits and integration notes. If no free option is reliable enough for either, say so explicitly — this settled decision ("automate where feasible") assumed a workable free option exists, and that assumption needs confirming or correcting.

## Answer

**Stocks/ETFs: Finnhub.** 60 calls/min free, real-time US-exchange data, key stays server-side. The only candidate with both a workable rate limit and non-EOD data — Alpha Vantage is 25 calls/day, Polygon's free tier is EOD-only at 5/min, FMP's free tier is EOD-only, IEX Cloud shut down in Aug 2024, and Yahoo's unofficial API is ToS-violating scraping with no SLA. Caveat: Finnhub's free-tier terms say "personal, non-commercial" — a defensible read for this non-monetized hobby project, but worth a direct look at their ToS before the multi-tenant phase ships to real users beyond you.

**Gold/metals: Metals.Dev primary, MetalpriceAPI fallback.** Both offer ~100 free requests/month. Metals.Dev has a ~60-second-delay live feed, with commercial use tied to "having an active plan" rather than flatly banned. MetalpriceAPI is daily-only but has unambiguous (if restrictive) non-commercial terms.

**Correction to a design assumption**: Metals-API.com (the provider this effort assumed by default) no longer has any free tier — confirmed on its live pricing page, paid starts at $19.99/mo. Use Metals.Dev instead.

**Cross-cutting requirement this surfaced (not optional)**: none of these free tiers survive N tenants each polling independently. The app must do one shared, server-side cached fetch (e.g. a cron-updated Supabase table) and serve every tenant's price lookups from that cache — not call the provider API per-tenant or per-request. Folded into the map's settled foundation and flagged on the data-model-schema ticket, since it needs its own (non-RLS'd, shared) table.

Full findings, comparison tables, and source URLs: [`research/market-data-apis.md`](../research/market-data-apis.md). A few figures (Finnhub, GoldAPI.io, FMP, Metals.Dev ToS text) are flagged there as lower-confidence — their pricing pages are JS-rendered SPAs the research tool couldn't fully render — worth a five-minute manual browser check before shipping.
