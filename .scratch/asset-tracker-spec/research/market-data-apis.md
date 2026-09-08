# Market Data APIs for FinAsset 360 — Free-Tier Research

Researched 2026-09-06. FinAsset 360 is a personal, soon-to-be small-multi-tenant net-worth
tracker on Next.js + Vercel + Supabase, all on free tiers. This doc evaluates free-tier
options for (1) stock/ETF quotes and (2) gold/precious-metals spot prices, using each
provider's own pricing/docs/ToS pages as the primary source wherever the page could be
fetched. Several provider pricing pages are JavaScript-rendered SPAs that returned only a
`<title>` tag to the fetch tool; where that happened, the claim is sourced from
independently-cross-checked secondary reporting and is explicitly flagged **(secondary,
lower confidence)**.

**Headline finding, read this first:** almost every stock/ETF and metals API with a
meaningfully free tier restricts that tier's *terms of service* to private, single-individual,
non-commercial use — several (Alpha Vantage, Finnhub, Twelve Data, Polygon/Massive,
Financial Modeling Prep, MetalpriceAPI) say so explicitly, and Alpha Vantage's own ToS
defines "commercial use" broadly enough to include "any type of commercial activity that
allows individuals or entities **other than User** to access information directly or
indirectly" — which literally describes a multi-tenant app serving quotes to more than one
person's account, even if nobody pays anything. This is a real gray area for the
"small-multi-tenant" phase of this project, not just a hypothetical one. See the "assumption
check" section at the bottom.

---

## 1. Stocks / ETFs

| Provider | Free-tier rate limit | API key required | Commercial use allowed on free tier | Data delay | Vercel/serverless gotchas | Source URL |
|---|---|---|---|---|---|---|
| **Alpha Vantage** | 25 requests/day (standard free key); no published free per-minute cap (paid tiers add 150–1200/min) | Yes | **No.** ToS: license is "for personal, non-commercial use"; "commercial use" is defined to include using the platform on behalf of any corporation/association, or "any type of commercial activity that allows individuals or entities other than User to access information directly or indirectly." Commercial use requires contacting `premium@alphavantage.co`. | Free quote endpoint updates end-of-day only; real-time/15-min-delayed requires a paid Premium plan | Server-side only recommended (key in query string); 25 req/day is too low to serve even a handful of tenants refreshing daily; no documented IP allowlisting | [alphavantage.co/premium](https://www.alphavantage.co/premium/), [alphavantage.co/documentation](https://www.alphavantage.co/documentation/), [terms_of_service (PDF)](https://www.alphavantage.co/terms_of_service/) |
| **Finnhub** | 60 API calls/minute; real-time for US stocks (some non-US exchanges 15-min delayed per exchange agreements) | Yes | **No** — free tier is documented as "personal, non-commercial projects"; commercial licensing requires contacting sales | Real-time (US exchanges) | Server-side only (API key must not ship to browser); 60/min is generous enough for a small multi-tenant app if quotes are cached/batched; no CORS/IP-allowlist requirement found | [finnhub.io/docs/api](https://finnhub.io/docs/api) *(pricing/ToS text confirmed via cross-checked secondary sources — Finnhub's pricing/docs pages are JS-rendered SPAs that returned no body text to the fetch tool; treat the exact "60/min" figure and non-commercial wording as **secondary, lower confidence** pending manual confirmation on finnhub.io)* |
| **Twelve Data** | Basic (free) plan: 8 API credits/minute, 800/day | Yes (implied by account-based plans; not explicitly stated on the pricing page) | **No** — pricing page states Individual/Basic plans are for "personal, internal, and non-commercial purposes" | Real-time for US equities/ETFs on the Basic plan per the pricing page | Server-side only; 8 req/min is thin — fine for a single low-traffic user, tight once several tenants poll independently (needs shared caching) | [twelvedata.com/pricing](https://twelvedata.com/pricing) |
| **IEX Cloud** | N/A — **service is dead** | N/A | N/A | N/A | Do not build against this; all endpoints return errors | IEX Group retired all IEX Cloud API products effective **August 31, 2024**. Confirmed via [status.iexapis.com](https://status.iexapis.com/) and corroborated by multiple independent write-ups: [github.com/api-evangelist/iex-cloud](https://github.com/api-evangelist/iex-cloud), [iexcloud.org](https://iexcloud.org/) *(secondary corroboration for the shutdown date/details, since IEX's own docs/dashboard are gone)* |
| **Polygon.io** (rebranded — pricing now lives under **massive.com**) | "Stocks Basic" free tier: 5 API calls/minute | Yes (sign-up required) | **No** — tier is explicitly labeled "Individual use only" | **End-of-day data only** on the free tier (no intraday/real-time) | 5 req/min is very tight; polygon.io/pricing now 301-redirects to massive.com/pricing — confirm this isn't a temporary/incomplete rebrand before depending on it long-term | [massive.com/pricing](https://massive.com/pricing) (redirect target of [polygon.io/pricing](https://polygon.io/pricing)) |
| **Financial Modeling Prep (FMP)** | 250 API calls/day; 500MB/30-day bandwidth cap | Yes | **No.** ToS explicitly prohibits "Commercial Use," defined to include any association with a company/organization/non-personal domain, and any collection/aggregation/analysis of FMP data "for commercial purposes... including market research, business intelligence, or data-driven decision-making." Redistributing/displaying FMP data requires a separate Data Display & Licensing Agreement. | End-of-day only on free tier; real-time requires the $15/mo Starter plan or above | Server-side only; FMP's own pricing page 403'd the fetch tool directly (Cloudflare bot protection) — pricing/limit figures here are **secondary, lower confidence**, but the ToS commercial-use prohibition was confirmed from FMP's own terms-of-service page text as surfaced in search | [site.financialmodelingprep.com/developer/docs/terms-of-service](https://site.financialmodelingprep.com/developer/docs/terms-of-service), [site.financialmodelingprep.com/developer/docs/pricing](https://site.financialmodelingprep.com/developer/docs/pricing) *(blocked 403 on direct fetch)* |
| **Yahoo Finance (unofficial)** | Unbounded in practice, but **not an API at all** — libraries like `yfinance` scrape Yahoo's internal, undocumented endpoints | No key, but no support either | Yahoo has no public developer terms for this because there is no sanctioned API; general Yahoo ToS prohibit "automated access without prior permission," and `yfinance`'s own PyPI page says it is "not affiliated, endorsed, or vetted by Yahoo" and intended for personal/research use | Real-time-ish in practice, but wholly unguaranteed | **High risk**: endpoints break/change without notice, get geo/IP-blocked, and Yahoo has cracked down on scraping repeatedly (see the frequent "yfinance keeps getting blocked" reports). No SLA, no support channel, ToS violation risk for anything beyond personal experimentation. Not recommended for a real (even small) product. | Yahoo retired its public finance API in 2017 with no replacement; risk assessment corroborated across multiple 2026 write-ups — **all secondary sources**, since there is no primary ToS/docs page for an API that doesn't officially exist. Representative: [scrapfly.io Yahoo Finance API guide](https://scrapfly.io/blog/posts/guide-to-yahoo-finance-api), [PyPI yfinance](https://pypi.org/project/yfinance/) |

### Other credible option noticed along the way

No other stock/ETF free-tier candidate stood out as meaningfully better than the above during this pass (e.g., Marketstack, EOD Historical Data, Tiingo were not directly re-verified here — flagging as **not researched**, not as "checked and rejected").

---

## 2. Gold / Precious Metals

| Provider | Free-tier rate limit | API key required | Commercial use allowed on free tier | Data delay/freshness | Vercel/serverless gotchas | Source URL |
|---|---|---|---|---|---|---|
| **Metals-API.com** | **No free plan exists as of this research (Sept 2026).** Cheapest paid tier is Copper at $19.99/mo for 2,500 calls/mo, 10-minute updates. | Yes (paid only) | N/A — no free tier to evaluate | N/A | N/A — do not plan around this provider having a free option; a Trustpilot review from Aug 2026 corroborates that Metals-API removed its previously-known free plan without notice | [metals-api.com/pricing](https://metals-api.com/pricing) *(fetched directly — primary source; the "was there once a free 50 req/mo plan" claim floating around older blog posts is now stale)* |
| **GoldAPI.io** | Reported as either 100 or 500 requests/month on the free plan — **secondary sources disagree**, and the site's pricing/ToS pages are JS-rendered SPAs that would not render body text for the fetch tool, so this figure is **unverified/lower confidence** | Yes (implied) | Secondary aggregator summaries describe GoldAPI.io's ToS as permitting end users "personal and commercial use" of the data — **this claim could not be confirmed against the primary ToS page text and should be independently re-verified before relying on it** | Reported as real-time; not independently confirmed | Could not verify integration details (CORS, allowlisting) due to JS-rendered pages blocking the fetch tool | [goldapi.io/kb/tos](https://www.goldapi.io/kb/tos) *(page exists but returned only a title to the fetch tool — treat all GoldAPI.io figures above as low-confidence pending manual verification)* |
| **MetalpriceAPI.com** | Free plan: **100 requests/month**, "Daily updates" only (paid tiers range from 30-min down to 15-second updates) | Not explicitly stated on the pricing page | **No.** Both the pricing page and ToS state free-plan data is "intended solely for personal exploration and evaluation purposes and must not be used for any commercial activities," and requires attribution to metalpriceapi.com | Daily (end-of-day equivalent) | 100 req/month (~3/day) means you must cache and share one fetch per day across *all* tenants server-side, never call per-request; matches the daily-refresh cadence anyway | [metalpriceapi.com/pricing](https://metalpriceapi.com/pricing) (fetched directly), ToS restriction cross-checked via [metalpriceapi.com/terms](https://metalpriceapi.com/terms) / [metalpriceapi.com/faq](https://metalpriceapi.com/faq) |
| **Metals.Dev** | Free plan: **100 requests/month**, live feed with max ~60-second delay, 5+ years historical, 170+ currencies | Not explicitly stated in the pages retrieved | Ambiguous but the most permissive of the metals options: ToS text (secondary-sourced) says rates may be published "for commercial purposes or for personal use, as long as you maintain an active subscription" — implying commercial use is tied to *having an active plan* (including, plausibly, the free one) rather than being flatly prohibited like MetalpriceAPI's wording. **Recommend a direct re-read of metals.dev/policy/terms before shipping** — that page 403'd the fetch tool during this research. | ~60 seconds (close to real-time) | Same caching discipline as MetalpriceAPI — 100/month budget (~3/day) forces a shared, cached fetch, not per-tenant calls | [metals.dev/pricing](https://metals.dev/pricing) *(confirmed via search-cached page text; the fetch tool got a 403 on direct retrieval)*, [metals.dev/policy/terms](https://metals.dev/policy/terms) *(403'd on direct fetch — commercial-use wording is secondary, lower confidence)* |
| **gold-api.com** (distinct from GoldAPI.io) | Advertised as **no rate limit** on real-time prices, no API key required (a "Get Symbols" endpoint explicitly states "No authentication required — Free endpoint with no rate limits") | **No** | ToS doesn't explicitly restrict commercial use, but also disclaims all reliability: "does not warrant that the Service will be uninterrupted, timely, secure, or error-free," and separately warns that "multiple requests per second" can trigger an IP ban despite the "no rate limiting" marketing claim | Real-time (values shown update within seconds) | CORS-enabled (usable directly from a browser, unusual for this space), but **no visible company/operator identity, no SLA, no support channel** — this looks like a solo/indie project; good as a free fallback, risky as a sole dependency for something you're calling "reliable" | [gold-api.com](https://gold-api.com/), [gold-api.com/terms](https://gold-api.com/terms), [gold-api.com/docs](https://gold-api.com/docs) |

---

## 3. Recommendation — Stocks/ETFs

**Use Finnhub.**

Reasoning: it is the only stock/ETF candidate that pairs a genuinely workable rate limit
(60 calls/minute) with real-time US-exchange data at no cost, an API key gate that's trivial
to keep server-side in a Next.js API route/serverless function, and no CORS or IP-allowlisting
obstacle. Alpha Vantage's 25 requests/day is too low to be "reliable" for even a single active
user checking a handful of tickers daily, let alone several tenants. Polygon/Massive's 5/min
free tier is EOD-only and even thinner than Alpha Vantage per-minute. FMP's 250/day is
serviceable but EOD-only on free, and its ToS commercial-use definition is broader/stricter
than Finnhub's. IEX Cloud is dead. Yahoo Finance's unofficial API is not a real option for a
product you intend to keep running — no SLA, ToS-violating, and breaks without warning.

**Caveat to carry forward, not hide:** Finnhub's free tier is documented (via secondary,
cross-checked sources — its own pricing/docs pages are JS SPAs the fetch tool couldn't
render) as restricted to "personal, non-commercial projects." A small-multi-tenant net worth
tracker that is not monetized and not run as a business is a defensible reading of "personal
project," but it is not unambiguously covered, and this is worth a five-minute read of
Finnhub's actual ToS page in a browser before the multi-tenant phase ships, plus keeping
usage low/cached so a ToS dispute is moot in practice.

## 4. Recommendation — Gold/Precious Metals

**Use Metals.Dev**, with MetalpriceAPI as the documented fallback.

Reasoning: Metals-API.com — the most-cited "default" choice in older material — **no longer
has a free tier at all** (confirmed directly against its live pricing page), which is exactly
the kind of assumption this research needed to correct. Of what remains, Metals.Dev's free
100 requests/month with a ~60-second-delay live feed is the best freshness-for-cost trade,
and its terms tie commercial use to having an active plan rather than flatly banning it the
way MetalpriceAPI's free tier does. MetalpriceAPI is the safer fallback precisely because its
restriction ("personal exploration and evaluation... must not be used for any commercial
activities") is unambiguous — pick it instead if you want zero ToS ambiguity and can accept
daily-only freshness, which is fine for a net-worth tracker that isn't showing intraday
metal-price charts. Either way: **cache one shared fetch per day server-side and serve it to
all tenants from that cache** — both providers' ~100/month budgets (roughly 3/day) require
this regardless of which one you pick, and it also sidesteps most of the "is this commercial
use" tension since you are not making a Metals.Dev/MetalpriceAPI call on every tenant
page-load.

GoldAPI.io was not recommended only because this research could not get past its
JavaScript-rendered pricing/ToS pages to confirm its numbers first-hand — its free tier
(100–500 req/month depending on which secondary source you believe) may in fact be
competitive or better; it's flagged as worth a follow-up manual check, not ruled out.
gold-api.com (no key, no limit, real-time) is worth keeping as a zero-cost backup precisely
because it has no quota to run out of, but its anonymous-operator, no-SLA nature means it
shouldn't be the *only* metals source a shipped product depends on.

## 5. Assumption check — does a workable free option exist for both categories?

**Stocks/ETFs: yes, conditionally.** Finnhub's free tier is workable for low-traffic
personal/small-multi-tenant use, provided usage is cached/batched and the "personal,
non-commercial" ToS language is read generously (a non-monetized hobby project, not a
business). This is close to, but not identical to, the app's presumed assumption of an
unambiguous free option — the ToS gray area is real and should be a known, accepted risk
rather than an unexamined one.

**Gold/metals: yes, but the specific provider the project may have assumed
(Metals-API.com) is wrong** — it dropped its free tier entirely. Metals.Dev (primary
recommendation) and MetalpriceAPI (fallback) both work at ~100 free requests/month,
which is plenty for a once-daily cached spot-price refresh, but is nowhere near enough for
frequent/real-time polling per tenant — the app's design must assume a shared daily cache,
not a live per-request metals API call.

**Net correction to the app's design assumption:** the free-tier options for both categories
are real but narrower than "just call the API" — both require (a) server-side-only calls
(never expose keys to the browser), and (b) a shared cache layer (e.g., a Supabase table
updated on a cron/cold-start-triggered basis) so that N tenants do not multiply request
volume by N. Without that caching layer, none of the free tiers researched — stocks or
metals — comfortably support "small-multi-tenant" traffic.
