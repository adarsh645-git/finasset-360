# Market data for Indian tickers, exchange and company name

Research for [ticket 09](../issues/09-indian-ticker-market-data.md). Pages read and API calls made on **2026-10-07**. Builds on [us-bulk-price-sources.md](../../us-market-prices/research/us-bulk-price-sources.md) (2026-09-19), which quoted the licences of Finnhub, Massive, FMP, EODHD, Tiingo, Twelve Data and Marketstack and found that none of their standard plans licenses showing prices to other users of a hosted app. Those licence quotes are not repeated here unless this question needs them; and [market-data-apis.md](../../asset-tracker-spec/research/market-data-apis.md) (2026-09-06).

## How to read this file

- **Measured** means I called the API myself today and report what came back. Finnhub calls used the project's own free key from `.env.local`. Twelve Data calls used no key or the public `demo` key.
- "Verbatim" text is copied from the provider's own page, in quotation marks.
- **Unverified** marks anything not confirmed from a primary source.
- Source-access notes: Finnhub's pricing page is a JS app; plan rows were read from its bundle (`/static/js/webpack/dist/main.bundle.*.js`) and endpoint text from [finnhub.io/static/swagger.json](https://finnhub.io/static/swagger.json). EODHD's demo key returned `Forbidden` for Indian tickers, and its exchange list page does not name India in the fetched text, so EODHD's India coverage comes from eodhd.com search results (ticker pages such as `BANKINDIA.NSE`). That is lower confidence. nseindia.com blocks plain fetches; its pages were read with a browser user-agent.

## 1. Answers in brief

1. **No free provider gives NSE quotes, name, sector and exchange under a licence that covers a multi-tenant app.** Finnhub's free key is refused for every Indian endpoint (measured). Twelve Data has NSE and BSE from its $29/mo Grow plan, but that is an individual, internal-use licence. NSE's own free daily files exist and work, but NSE's terms forbid automated collection and display without permission. Yahoo forbids both too.
2. **The US exchange is already in what we call.** Finnhub `/stock/symbol?exchange=US` returns a `mic` per row (XNAS, XNYS, ARCX, BATS, XASE, OOTC). `fetchFinnhubSymbolList` drops it. Keeping it costs no new call and no new licence question.
3. **Licence:** the same as the US finding. Every individual plan forbids display to third parties. Twelve Data is the only provider with a published self-serve business plan that permits "External display" (Venture, from $149/mo), and even that needs "additional approval" for prices outside the US.
4. **Sectors:** NSE's own classification has 12 macro sectors and 22 sectors. At sector level it maps cleanly onto the mockup's 12 (table in section 6). In practice we'd map the provider's sector string, not NSE's, since no clean source serves NSE's classification.

## 2. Comparison table

| Source | NSE / BSE quotes | Name | Sector | Exchange | Cheapest plan with all of it | Freshness | Display to other app users? |
|---|---|---|---|---|---|---|---|
| **Finnhub** (current) | **No** on free (measured: "You don't have access to this resource."). International = end-of-day on paid plans; real-time international "for Enterprise clients" | Yes via `/search` (free, measured) | `/stock/profile2` refused for `.NS` on free (measured) | `.NS` suffix; US rows carry `mic` | Not published (All-In-One $3,500/mo is the only plan listing international market data; India not named) | EOD for non-LSE international | No ("strictly for personal use") |
| **Twelve Data** | Yes, NSE (XNSE) and BSE (XBOM), **EOD**, plan "Grow" and up | Yes (`/stocks`, `/quote`) | Yes (`/profile`, 10 credits, Grow and up) | Yes (`exchange`, `mic_code`) | **Grow, from $29/mo** (individual) | End of day | Individual plans: no. **Venture (from $149/mo)**: "External display", but non-US prices need "additional approval" |
| **EODHD** | Yes, `.NSE` / `.BSE` tickers (secondary confidence) | Yes | Fundamentals API only ($59.99/mo plan) | Yes (ticker suffix) | $19.99/mo for prices; $59.99/mo adds sector; All-in-One $99.99/mo | EOD; live API 15–20 min delayed | Personal plans: no ("displaying, or granting access") |
| **Alpha Vantage** | BSE only (docs sample `RELIANCE.BSE`); no NSE sample | `SYMBOL_SEARCH` | Not checked | Suffix | Free, 25 req/day | EOD on free | No (non-commercial ToS) |
| **FMP** | "Full Global Coverage" only on Ultimate ($99/mo annual) | Yes | Yes | Yes | Ultimate | Real-time paid | No without a Data Display agreement |
| **Yahoo (unofficial)** | Yes in practice (`INFY.NS`) | Yes | Yes | Yes | No official API | Real-time-ish | **No.** ToS forbids automated access and commercial reuse. Measured: first two calls from this machine returned `Too Many Requests` |
| **NSE direct files** | Yes: daily bhavcopy, all NSE securities in one ~200 KB zip (measured: 3,702 rows for 2026-10-06) | Yes: `EQUITY_L.csv`, 2,602 rows, symbol + company name + ISIN (measured) | No (not in either file) | NSE only | Free | End of day | **No.** NSE ToU forbids automated collection and display without written permission |
| **Broker APIs** (e.g. Zerodha Kite Connect) | Yes, tied to one broker account | Yes | No | Yes | Kite Connect ₹500/mo for live and historical | Real-time | No ("cannot be displayed to the public at large") |

## 3. Provider details

### 3.1 Finnhub (what we already call)

Sources: [swagger.json](https://finnhub.io/static/swagger.json), [pricing](https://finnhub.io/pricing) (JS bundle), [ToS](https://finnhub.io/terms-of-service).

- `/quote`, verbatim: "Get real-time quote data for US stocks. ... Real-time stock prices for international markets are supported for Enterprise clients via our partner's feed."
- Free plan table: "US Market Data → Coverage: US". The "International Market Data" rows (named markets: "TSX, LSE, Euronext, Deutsche Börse *") show a cross for Free. Footnote, verbatim: "* LSE data is delayed by 15 minutes. Other international markets support end-of-day data only." India is not named on the pricing page.
- **Measured with the project's free key:**
  - `quote?symbol=INFY.NS`, `quote?symbol=RELIANCE.NS`, `stock/profile2?symbol=INFY.NS`, `stock/symbol?exchange=NS`: all returned `{"error":"You don't have access to this resource."}`.
  - `search?q=infosys`: returned `INFY.NS` "Infosys Ltd", `HCL-INSYS.NS` and others. So free Finnhub can **name** an Indian ticker but not price, classify or list it.
  - `stock/profile2?symbol=AAPL`: `"exchange":"NASDAQ NMS - GLOBAL MARKET"`, `"finnhubIndustry":"Technology"`.
- **US exchange.** Schema `StockSymbol.mic`: "Primary exchange's MIC." Measured `stock/symbol?exchange=US`: 31,109 rows. MIC counts: OOTC 17,623; XNAS 5,724; XNYS 2,967; ARCX 2,807; BATS 1,663; XASE 324; IEXG 1. Examples: AAPL `XNAS`, IBM `XNYS`, SPY `ARCX` (type `ETP`). `src/lib/market-data/finnhub.ts` maps only `symbol`, `description`, `type`, so the field is discarded today. A display map is small: XNAS→NASDAQ, XNYS→NYSE, ARCX→NYSE Arca, BATS→Cboe BZX, XASE→NYSE American, OOTC→OTC.

### 3.2 Twelve Data

Sources: [pricing](https://twelvedata.com/pricing), [business pricing](https://twelvedata.com/pricing-business), [exchanges](https://twelvedata.com/exchanges), [docs](https://twelvedata.com/docs), [Commercial and personal usage](https://support.twelvedata.com/en/articles/5332349-commercial-and-personal-usage) (dated August 4, 2026), [EOD pricing market data](https://support.twelvedata.com/en/articles/12682324-end-of-day-eod-pricing-market-data) (dated August 18, 2026), [Terms](https://twelvedata.com/terms).

- **Coverage:** the exchanges page lists "National Stock Exchange of India · XNSE · India · EOD · Su-Th, 09:15 - 15:30 (IST) · Grow Venture" and "Bombay Stock Exchange · XBOM · India · EOD · ... Grow Venture". So India is end-of-day only, from Grow (individual) or Venture (business). Basic (free) covers "3" markets.
- **Measured without a key:** `api.twelvedata.com/exchanges?country=India` returned BSE (XBOM) and NSE (XNSE). `api.twelvedata.com/stocks?exchange=NSE` returned NSE rows with `name`, `currency: INR`, `mic_code: XNSE`, `type`. The reference list is open. `isin` reads `request_access_via_add_ons`.
- **Measured with `demo` key:** `quote?symbol=INFY&exchange=NSE` returned name "Infosys Ltd.", `exchange: NSE`, `close: 992`, `previous_close`, `currency: INR`. `profile?symbol=INFY&exchange=NSE` returned `"sector":"Technology","industry":"Information Technology Services"`. The demo key refused `TCS` ("only used for initial familiarity"), so this is a sample, not access.
- `/profile`, verbatim: "API credits cost 10 per symbol. This API endpoint is available on the Grow plan (individual) and the Venture plan (business) and above." `/quote` costs 1 credit per symbol.
- **Plans:** individual Basic free (8 credits/min, 800/day); Grow from $29/mo (55+ credits/min); Pro from $99/mo; Ultra from $329/mo. Business: Venture "From $149 /mo" (610+ credits), Enterprise from $1,099/mo. The cards also show higher credit levels at higher prices (for example Venture "$499 / $414 billed yearly", "ideal for companies showcasing data on client-facing apps or websites"). Which credit level sits at the "from" price is not fully clear from the page.
- **Licence, verbatim:**
  - Grow tooltip: "View-only access for internal use within your applications and dashboards. The data may be displayed but cannot be programmatically processed, stored, transformed, or redistributed."
  - Venture tooltip: "Display the data to end users in external applications, websites, or client-facing products. Redistribution via raw data feeds or APIs is not permitted unless explicitly licensed."
  - Support article: "Individual plans ... do not permit: redistribution of data, commercial display of data to third parties." And: "Business plans allow the use of data for commercial display and internal usage, subject to exchange licensing requirements. **Price data for regions outside the United States requires additional approval for commercial use.**"
- **Implication.** Grow covers the data needs at the lowest price, but under the same licence posture as today's Finnhub use. Venture is the first plan whose text allows showing prices to app users. Indian prices on Venture still need Twelve Data's (and presumably NSE's) approval, at a cost not published.

### 3.3 EODHD

Sources: [pricing](https://eodhd.com/pricing), [live (delayed) API](https://eodhd.com/financial-apis/live-realtime-stocks-api), [exchanges API](https://eodhd.com/financial-apis/list-supported-exchanges), eodhd.com ticker pages found by search (for example `BANKINDIA.NSE`). Licence per us-bulk-price-sources §3.3.

- India: tickers take the form `INFY.NSE` and `<code>.BSE` (search snippets of eodhd.com). The demo key returned `Forbidden` for `INFY.NSE`. Coverage is **secondary confidence**.
- Plans (summarised fetch of the pricing page): Free 20 calls/day; EOD All World $19.99/mo; EOD+Intraday $29.99/mo; Fundamentals $59.99/mo (has sector, no prices); All-In-One $99.99/mo. The live API is "15-20 min" delayed, "1 API call per ticker", and included from Free up.
- Licence: personal plans may not be used for "displaying, or granting access" to others. The $399/mo Internal Use plan forbids display outside the company. Enterprise ($2,499/mo) display terms are unverified.

### 3.4 Alpha Vantage

Source: [documentation](https://www.alphavantage.co/documentation/). The only Indian sample is "Sample ticker traded in India - BSE ... symbol=RELIANCE.BSE" for `TIME_SERIES_DAILY`. No NSE sample appears. The free tier is 25 requests/day, under a non-commercial ToS (see market-data-apis.md). Not a fit.

### 3.5 Yahoo Finance (unofficial)

Source: [Yahoo Terms of Service](https://legal.yahoo.com/us/en/yahoo/terms/otos/index.html), last updated May 6, 2025. Verbatim, you must not "access or collect data ... from our Services using any automated means ... for any purpose without our express, prior permission", and "Unless otherwise expressly stated, you may not access or reuse the Services, or any portion thereof, for any commercial purpose." There is no official API. **Measured:** `query1.finance.yahoo.com/v8/finance/chart/INFY.NS` and `/v10/finance/quoteSummary/INFY.NS` both returned `Too Many Requests` on the first try. The mockup can still *link* to `finance.yahoo.com/quote/INFY.NS` (handoff README). Linking is not data use.

### 3.6 NSE's own files

Sources: [NSE Terms of Use](https://www.nseindia.com/static/nse-terms-of-use), [NSE Data Sharing & Usage Policy](https://www.nseindia.com/static/market-data/nse-data-policy).

- **Measured:** `nsearchives.nseindia.com/content/cm/BhavCopy_NSE_CM_0_0_0_20261006_F_0000.csv.zip` returned 200, 207 KB, 3,702 lines with `TckrSymb`, `ISIN`, `FinInstrmNm`, `ClsPric`, `PrvsClsgPric`. `nsearchives.nseindia.com/content/equities/EQUITY_L.csv` returned 2,602 lines: `SYMBOL, NAME OF COMPANY, SERIES, DATE OF LISTING, ..., ISIN NUMBER`. Neither file has a sector.
- **Terms, verbatim:** "User is prohibited to conduct any systematic or automated data collection activities (including scraping, data mining, data extraction and data harvesting) on or in relation to our Website". Also, data "shall not be copied, ... stored (either in hardcopy or in an electronic retrieval system), ... disseminated, distributed, displayed, ... without prior written permission of NSE. Unless the information or Content is available for download, not to aggregate, copy or duplicate". The "available for download" carve-out applies to aggregating and copying. It does not lift the display, storage or automated-collection bans.
- Data policy, verbatim: "Any Market Data being accessed for commercial purposes shall be provided by NSE Data at a price approved by its Board"; "The Board of NSE Data may also consider introducing reduced fee arrangements or waivers for Non-Commercial Users."
- A daily cron pulling the bhavcopy is automated collection, and showing the prices to signed-in users is display. Technically ideal (one call, whole market, free), but not licensed without NSE Data's permission.

### 3.7 Broker APIs (Zerodha Kite Connect as the example)

Sources: [zerodha.com/products/api](https://zerodha.com/products/api/), [kite.trade/terms](https://kite.trade/terms). "Connect" costs "₹ 500 / month" for "realtime WebSocket streaming and historical candle data". The terms say, verbatim, "live market data obtained via Kite Connect cannot be displayed to the public at large". The data is also tied to one broker account holder. Not a fit for open sign-up. Other brokers (Upstox, Angel One) were not read.

## 4. Licence: the crux, restated for India

Every source above that can price NSE is either (a) an individual or personal plan that forbids showing data to third parties, or (b) the exchange itself, which forbids automated collection and display. The only published self-serve route to display rights is Twelve Data **Venture (from $149/mo)**, and for India it still needs extra approval. This matches the US finding. The app's existing Finnhub use already accepts this risk for US prices. Indian prices from Twelve Data Grow or EODHD would sit in the same grey zone, no worse and no better.

## 5. Ticker format

The mockup stores Yahoo symbols (`INFY.NS`; Yahoo uses `.BO` for BSE). Finnhub also uses `.NS` (measured in `/search`). Twelve Data takes `symbol=INFY&exchange=NSE`. EODHD uses `INFY.NSE`. Keep the Yahoo form as the stored key and translate per provider: `.NS`→NSE, `.BO`→BSE.

## 6. Indian sectors → the mockup's 12

NSE's classification is from [NSE Indices Industry Classification Structure, March 2022](https://nsearchives.nseindia.com/web/sites/default/files/inline-files/NSE%20Indices_Industry%20Classification%20Structure-2022-03.pdf): "12 Macro-Economic Sectors, 22 Sectors, 59 Industries and 197 Basic Industries". The macro-sector level does not map 1:1 (Realty and Media sit under Consumer Discretionary). Map at the 22-sector level:

| NSE macro sector | NSE sector | → Mockup sector |
|---|---|---|
| Commodities | Chemicals; Construction Materials; Metals & Mining; Forest Materials | Materials |
| Consumer Discretionary | Automobile and Auto Components; Consumer Durables; Textiles; Consumer Services | Consumer Discretionary |
| Consumer Discretionary | Media, Entertainment & Publication | Communication Services |
| Consumer Discretionary | Realty | Real Estate |
| Energy | Oil, Gas & Consumable Fuels | Energy |
| Fast Moving Consumer Goods | Fast Moving Consumer Goods | Consumer Staples |
| Financial Services | Financial Services | Financials |
| Healthcare | Healthcare | Healthcare |
| Industrials | Construction; Capital Goods | Industrials |
| Information Technology | Information Technology | Technology |
| Services | Services (Engineering, Transport Services, Transport Infrastructure, Commercial Services & Supplies) | Industrials |
| Telecommunication | Telecommunication | Communication Services (Telecom Equipment arguably Technology) |
| Utilities | Power; Utilities | Utilities |
| Diversified | Diversified | Other |

Every mockup sector is reachable, and the mapping needs no lossy guesses except Diversified → Other.

**In practice the string to map is the provider's, not NSE's.** No licensed API serves NSE's classification. Twelve Data's `/profile` returned `"sector":"Technology"` for INFY, the same form as its AAPL sample. Its full sector vocabulary is unverified, but if it matches its US sectors, one provider→mockup map covers both countries. Finnhub's `finnhubIndustry` (used today for US) is a separate, finer vocabulary and needs its own map. Unmapped strings fall to Other. The mockup already lets the user pick a sector for unknown tickers.

## 7. Recommendation

**Do now (free, no new licence exposure):**

1. **Persist Finnhub's `mic`** in `stock_symbol` and show the mapped exchange for US positions. It is already in the weekly payload.
2. **Indian tickers go through the mockup's "unknown ticker" path:** the user enters price and sector. Optionally fill the company name from Finnhub `/search`, which works on the free key and carries the same licence posture as today's US lookups. India auto-appends `.NS`. The "Open on Yahoo Finance" link works as is.

**When automatic Indian prices are wanted, choose by risk appetite:**

| Option | Cost | Gets | Licence position |
|---|---|---|---|
| **A. Twelve Data Grow** (recommended next step) | from $29/mo | NSE + BSE EOD quotes, name, exchange/MIC, sector (one provider for all four fields); open NSE symbol list for lookup | Same grey zone as current Finnhub use. Text: "internal use", no "commercial display of data to third parties"; Grow also says data cannot be "stored" |
| B. EODHD EOD All World | $19.99/mo (+$40 for sector via the $59.99 Fundamentals plan) | NSE/BSE EOD + 15–20-min delayed live; sector only on the Fundamentals plan | Same grey zone; personal plans may not display to others |
| C. Twelve Data Venture + India approval | from $149/mo + unpublished approval | As A, with external display rights | The only published path to a clean licence, at a cost only a sales conversation can settle |
| D. NSE bhavcopy cron | Free | All NSE closes in one 200 KB file, names from `EQUITY_L.csv`, no sector | Explicitly forbidden (automated collection, storage, display) without NSE Data's written permission |
| E. Yahoo unofficial | Free | Everything | Forbidden by ToS, and rate-limited on first try. Not for a shipped app |

**Trade-offs.** A is the cheapest single source that answers name, sector, exchange and price for India. It also gives the app a consistent sector vocabulary, which would let US sectors move off `finnhubIndustry` later (not required). Its costs are $29/mo, end-of-day freshness only, a second provider beside Finnhub, and Grow's "cannot be ... stored" clause, which sits awkwardly with the shared `price_cache`. B is cheaper for prices alone and fresher (delayed intraday), but sector costs more and its India coverage was only confirmed second-hand. Staying manual for India costs nothing and has no licence exposure, but users must type Indian prices and their values go stale. If the app ever charges money or grows past friends and family, only C (or a direct NSE Data licence) is defensible. The same applies to the US side.

## 8. Not answered from primary sources

1. Whether Finnhub sells NSE end-of-day data on any self-serve plan (the pricing page names only TSX, LSE, Euronext and Deutsche Börse).
2. Twelve Data: the cost and process of "additional approval" for Indian prices on Venture; its full sector vocabulary; whether the Grow plan's "cannot be ... stored" clause forbids a shared server-side cache.
3. EODHD: India coverage and the Indian fields of its Fundamentals API, confirmed from EODHD's own docs (the demo key was refused).
4. NSE Data's fee or waiver for a non-commercial web app displaying end-of-day prices ("reduced fee arrangements or waivers for Non-Commercial Users" is mentioned, with no terms published).
5. Whether BSE's own downloadable files carry terms different from NSE's (BSE not read).
