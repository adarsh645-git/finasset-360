> Snapshot of [#9](https://github.com/adarsh645-git/finasset-360/issues/9). The GitHub issue is canonical.

# Market data for Indian tickers, exchange and company name

Type: research
State: closed (completed)
Blocked by: none

## Question

The mockup's Positions use Yahoo symbols ("AAPL", "INFY.NS"). Ticker lookup previews "name · sector · price · exchange", and India auto-appends `.NS`. Today `stock_symbol` (Finnhub, ~31k rows) is US-only with no exchange field, and the price cron is Finnhub `/quote` for held US symbols.

Find out, from primary sources:
- which provider(s) can give **NSE (and BSE?) quotes, company name, sector and exchange** for a personal, multi-tenant hosted app, on a free or cheap tier: Finnhub's free-tier coverage of `.NS`, Yahoo (unofficial), Twelve Data, EODHD, Alpha Vantage, others;
- whether US symbols' **exchange** (NASDAQ / NYSE) is available from what we already call (Finnhub `/stock/symbol` has `mic`);
- what each provider's licence says about showing prices to other users of a hosted app. The us-market-prices research (local `.scratch/us-market-prices/research/us-bulk-price-sources.md`) found this to be the crux for US data, so read it first;
- how Indian sectors map onto the mockup's 12-sector list.

Output: `research/indian-ticker-market-data.md`, with a recommendation and its trade-offs.

**Blocked by:** none.

## Comments

### adarsh645-git, 2026-10-14

## Answer

Findings: [`indian-ticker-market-data.md`](https://github.com/adarsh645-git/finasset-360/blob/research/indian-ticker-market-data/.scratch/mockup-redesign/research/indian-ticker-market-data.md) on the never-merged `research/indian-ticker-market-data` branch (read 2026-10-07).

- **No free provider gives NSE quotes, name, sector and exchange under a licence that covers a multi-tenant app.** Finnhub's free key is refused for every Indian endpoint (measured). Twelve Data has NSE and BSE end-of-day from Grow ($29/mo), but that's an individual, internal-use licence. Venture (from $149/mo) allows external display, but non-US prices need extra approval. NSE's own free files and Yahoo both forbid automated collection and display.
- **US exchange is free:** Finnhub `/stock/symbol?exchange=US` already returns `mic` (XNAS, XNYS, …). `fetchFinnhubSymbolList` drops it today, so store it.
- **Indian company name** is available from Finnhub `/search` on the free tier.
- **Sectors:** NSE's macro sectors map cleanly onto the mockup's 12 (table in section 6). In practice we'd map whatever the provider returns.

Recommendation: store the US exchange now. Indian tickers go manual (price and sector entered by hand, name via `/search`) unless a paid feed is chosen in #12.
