# market-data

## Purpose

Keeps the shared, non-tenant market data the Portfolio is valued with: ticker data (name, exchange, Sector), cached prices, and the daily FX Rate. Runs the scheduled jobs that refresh them and take daily Stocks snapshots, and answers ticker lookups.

## ADDED Requirements

### Requirement: Shared market data is readable by every User and written only by the server
Ticker data, cached prices and FX Rates SHALL be shared across Users. Any signed-in User SHALL be able to read them, and no User session SHALL be able to write them.

#### Scenario: MD-01 A User can read but not write market data
- **GIVEN** a signed-in User and a stored `<table>` row
- **WHEN** the User reads it and then tries to change it with their own session
- **THEN** the read returns the row and the change is refused

Examples:

| table |
|---|
| stock_symbol |
| price_cache |
| fx_rate |

### Requirement: Scheduled jobs require the cron secret
Each scheduled job SHALL refuse to run unless called with the configured cron secret.

#### Scenario: MD-02 A call without the secret is refused
- **GIVEN** the daily and weekly jobs
- **WHEN** either is called with no secret or a wrong one
- **THEN** it is refused as unauthorized and changes nothing

### Requirement: The weekly symbol refresh keeps the exchange
The weekly job SHALL store every US symbol's name, type and exchange (its `mic`, e.g. XNAS) from Finnhub's symbol list. It SHALL NOT clear a Sector already resolved for a ticker.

#### Scenario: MD-03 Symbols are stored with their exchange
- **GIVEN** a stored AAPL row with Sector Technology, and a provider symbol list with AAPL (`XNAS`) and JPM (`XNYS`)
- **WHEN** the weekly job runs
- **THEN** AAPL has exchange `XNAS` and still has Sector Technology
- **AND** JPM has exchange `XNYS` and no Sector yet

### Requirement: Provider industries map onto the 12 Sectors
A ticker's Sector SHALL be one of Technology, Financials, Healthcare, Energy, Consumer Discretionary, Consumer Staples, Communication Services, Industrials, Utilities, Materials, Real Estate or Other. A provider industry SHALL be mapped onto that list, and anything unmapped or blank SHALL become Other.

#### Scenario: MD-04 Mapping provider industries
- **GIVEN** a known US ticker with no Sector yet, whose provider industry is `<industry>`
- **WHEN** it is looked up
- **THEN** its Sector is `<sector>`, and that Sector is stored for later lookups

Examples:

| industry | sector |
|---|---|
| Technology | Technology |
| Semiconductors | Technology |
| Banking | Financials |
| Insurance | Financials |
| Pharmaceuticals | Healthcare |
| Oil & Gas | Energy |
| Retail | Consumer Discretionary |
| Food Products | Consumer Staples |
| Media | Communication Services |
| Machinery | Industrials |
| Utilities | Utilities |
| Chemicals | Materials |
| Real Estate | Real Estate |
| (blank) | Other |
| Shell Companies | Other |

### Requirement: Ticker lookup previews a ticker for a Country
A lookup by ticker and Country SHALL normalise the ticker (upper case; `.NS` added for India when there's no suffix). A known ticker SHALL return its name, Sector, exchange and price. Any other ticker SHALL return "unknown", with a name from the provider's search when it finds one.

#### Scenario: MD-05 A known US ticker
- **GIVEN** AAPL is stored as "Apple Inc." on `XNAS` with Sector Technology and a cached price of 232.10
- **WHEN** a User looks up `aapl` for US
- **THEN** the result is known: AAPL, "Apple Inc.", Technology, exchange NASDAQ, price 232.10 USD

#### Scenario: MD-06 An India ticker is unknown but named
- **GIVEN** no market data for `INFY.NS`, and the provider's search returns "Infosys Ltd" for it
- **WHEN** a User looks up `INFY` for India
- **THEN** the result is unknown, with ticker `INFY.NS`, exchange NSE and name "Infosys Ltd"

#### Scenario: MD-07 An unknown ticker with no search match
- **GIVEN** no market data for `TDF2055` and no search match
- **WHEN** a User looks up `TDF2055` for US
- **THEN** the result is unknown with no name

#### Scenario: MD-08 A known ticker with no price gets its first price
- **GIVEN** NVDA is in the symbol list with no cached price, and the provider quotes it at 128.20
- **WHEN** a User looks up `NVDA` for US
- **THEN** the result is known with price 128.20
- **AND** that price is cached for every User

### Requirement: Market data beats a Hand Price
Where a Position's ticker has a cached market price, that price, name and Sector SHALL be used, even if the Position also has a Hand Price. Otherwise the Position's Hand Price, Sector and name SHALL be used.

#### Scenario: MD-09 A feed price overrides a Hand Price
- **GIVEN** a Position in `INFY.NS`, 10 shares, with Hand Price 1,880
- **WHEN** a cached market price of 1,900 for `INFY.NS` appears and the Portfolio is read
- **THEN** the Position is priced at 1,900 from market data, and the Holding is worth 19,000

### Requirement: The daily job records today's FX Rate and fills gaps
The daily job SHALL fetch INR-per-USD rates from Frankfurter from the day after the latest stored rate through today, and upsert one row per published date. With an empty table it SHALL start from 2018-01-01. If the fetch fails, it SHALL store nothing and the other daily steps SHALL still run.

#### Scenario: MD-10 Today's rate is stored
- **GIVEN** a latest stored rate on yesterday's date, and Frankfurter publishes 83.40 for today
- **WHEN** the daily job runs
- **THEN** the FX Rate table has 83.40 for today

#### Scenario: MD-11 A missed run is filled in
- **GIVEN** a latest stored rate 4 days ago, and Frankfurter publishes rates for the 3 business days since
- **WHEN** the daily job runs
- **THEN** those 3 dates are stored

#### Scenario: MD-12 An empty table is backfilled from 2018
- **GIVEN** an empty FX Rate table
- **WHEN** the daily job runs
- **THEN** it requests the series from 2018-01-01 to today and stores every published date

#### Scenario: MD-13 An FX outage changes nothing else
- **GIVEN** Frankfurter is unreachable
- **WHEN** the daily job runs
- **THEN** no FX Rate is written, the latest stored rate is kept
- **AND** prices and Stocks snapshots are still refreshed

### Requirement: The daily job refreshes prices for held tickers
The daily job SHALL fetch a quote for each distinct ticker held in a non-archived Stocks Holding that is in the US symbol list. A failed quote SHALL keep the previous cached price and record the error.

#### Scenario: MD-14 Only held, listed tickers are quoted
- **GIVEN** active Positions in AAPL and `INFY.NS`, and an archived Holding's Position in TSLA
- **WHEN** the daily job runs
- **THEN** only AAPL is quoted

#### Scenario: MD-15 A failed quote keeps the last price
- **GIVEN** AAPL cached at 230.00 and a provider error for AAPL today
- **WHEN** the daily job runs
- **THEN** AAPL is still cached at 230.00, with the error recorded

### Requirement: The daily job snapshots every active Stocks Holding
After refreshing prices, the daily job SHALL upsert today's Valuation for every non-archived Stocks Holding, at Σ shares × price (market data first, else the Hand Price), using the last cached price when today's quote failed. It SHALL NOT write Valuations for any other Holding.

#### Scenario: MD-16 Snapshots for every User's Stocks Holdings
- **GIVEN** User A's US Stocks Holding with 10 AAPL and User B's India Stocks Holding with 90 `INFY.NS` at Hand Price 1,880, and AAPL quoted at 232.10 today
- **WHEN** the daily job runs
- **THEN** User A's Holding has a Valuation of 2,321.00 dated today
- **AND** User B's Holding has a Valuation of 169,200 dated today

#### Scenario: MD-17 A failed quote still yields a snapshot
- **GIVEN** a Stocks Holding with 10 AAPL, AAPL cached at 230.00, and a provider error for AAPL today
- **WHEN** the daily job runs
- **THEN** the Holding has a Valuation of 2,300.00 dated today

#### Scenario: MD-18 Snapshots skip archived and manual Holdings, and rerun safely
- **GIVEN** an archived Stocks Holding and an active Cash Holding
- **WHEN** the daily job runs twice today
- **THEN** neither gets a Valuation dated today
- **AND** every active Stocks Holding has exactly one Valuation dated today

### Requirement: Snapshots are marked automatic
A Valuation written by the daily job SHALL be marked automatic. If the User already saved that Holding's Valuation that day, the snapshot SHALL update its value and keep it marked user-entered.

#### Scenario: MD-19 Snapshots are marked automatic, and never overwrite a User's mark
- **GIVEN** Stocks Holding S1 with no Valuation today, and Stocks Holding S2 that the User saved earlier today
- **WHEN** the daily job runs
- **THEN** S1's Valuation for today is marked automatic
- **AND** S2's Valuation for today has the snapshot's value and is still marked user-entered
