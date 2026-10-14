# position-drawer

## Purpose

The Position drawer: a side panel that shows one Position of a Stocks Holding (its value, price, cost and gain, and its weight in the User's Stocks) with a link to Yahoo Finance and a way back to its account. It opens from any page that lists Positions.

## ADDED Requirements

### Requirement: The drawer opens from the URL on any page
The drawer SHALL open on any page in the app shell whose URL carries `position=<holdingId>~<ticker>` naming a Position of one of the User's current Stocks Holdings. Otherwise no drawer SHALL open. Closing it (×, the backdrop or Esc) SHALL remove only the `position` param.

#### Scenario: PD-01 Which params open the drawer
- **GIVEN** a current US Stocks Holding h5 holding AAPL, and an archived Stocks Holding h6 holding MSFT
- **WHEN** `<page>` is opened with `<param>`
- **THEN** `<outcome>`

Examples:

| page | param | outcome |
|---|---|---|
| `/holdings/h5` | `position=h5~AAPL` | the AAPL drawer opens |
| `/assets/stocks` | `position=h5~AAPL` | the AAPL drawer opens |
| `/` | `position=h5~AAPL` | the AAPL drawer opens |
| `/holdings/h5` | `position=h5~TSLA` | no drawer opens |
| `/holdings/h5` | `position=h6~MSFT` | no drawer opens |
| `/holdings/h5` | `position=h5` | no drawer opens |

#### Scenario: PD-02 Closing keeps the rest of the URL
- **GIVEN** the drawer open at `/assets/stocks?range=1Y&position=h5~AAPL`
- **WHEN** the User closes it
- **THEN** the URL is `/assets/stocks?range=1Y`

### Requirement: The drawer identifies the Position and its value
The drawer SHALL show the ticker without exchange suffix, the exchange (or "—" when unknown), the name, a Sector dot with "⟨Sector⟩ · held in ⟨account⟩", the Position's value in USD at today's FX Rate, and a native line: "⟨shares⟩ shares × ⟨price⟩" for a US Position, or "⟨native value⟩ at ₹⟨rate⟩/$" for an India one.

#### Scenario: PD-03 Header and value
- **GIVEN** today's FX Rate is 83.40 and `<position>`
- **WHEN** its drawer opens
- **THEN** it shows `<ticker>`, `<exchange>`, `<identity>`, `<usd>` and `<native>`

Examples:

| position | ticker | exchange | identity | usd | native |
|---|---|---|---|---|---|
| AAPL in "Fidelity Brokerage": 30 sh at a market price of 232.10, Apple Inc., Technology, NASDAQ | AAPL | NASDAQ | Apple Inc. · Technology · held in Fidelity Brokerage | $6,963 | 30 shares × $232 |
| INFY.NS in "Zerodha": 90 sh at a Hand Price of 1,880, "Infosys Limited", Technology | INFY | NSE | Infosys Limited · Technology · held in Zerodha | $2,029 | ₹1,69,200 at ₹83.40/$ |
| TDF2055 in "Roth IRA": 100 sh at a Hand Price of 45, Sector Other, no name | TDF2055 | — | TDF2055 · Other · held in Roth IRA | $4,500 | 100 shares × $45 |

### Requirement: The drawer shows six stats
The drawer SHALL show six stats in a 2×3 grid: Price, Shares, Avg cost ("Per share"), Cost basis, Unrealized gain (signed, coloured, with its %), and Weight in stocks (the Position's USD value as a share of all current Stocks Holdings). The Price sub-label SHALL be "Market price", or "as of ⟨D Mon⟩" for a Hand Price.

#### Scenario: PD-04 A market-priced Position's stats
- **GIVEN** AAPL in a US Stocks Holding (30 sh, avg 165, market price 232.10), and the User's current Stocks total $10,653
- **WHEN** its drawer opens
- **THEN** the stats read Price "$232" / "Market price", Shares "30", Avg cost "$165" / "Per share", Cost basis "$4,950", Unrealized gain "+$2,013" / "+40.7%", and Weight in stocks "65%"

#### Scenario: PD-05 A hand-priced Position's stats
- **GIVEN** today is 2026-10-14 and INFY.NS in an India Stocks Holding (90 sh, avg 1,450, Hand Price 1,880 as of 2026-08-03)
- **WHEN** its drawer opens
- **THEN** Price reads "₹1,880" / "as of 3 Aug", Cost basis "₹1,30,500", and Unrealized gain "+₹38,700" / "+29.7%"

### Requirement: Yahoo Finance is linked only for tickers it can show
"Open on Yahoo Finance ↗" SHALL show when the ticker has market data or ends in `.NS` or `.BO`, and SHALL open `https://finance.yahoo.com/quote/⟨ticker⟩` (ticker URL-encoded, with its suffix) in a new tab.

#### Scenario: PD-06 The Yahoo link rule
- **GIVEN** a Position with ticker `<ticker>` and `<data>`
- **WHEN** its drawer opens
- **THEN** the Yahoo Finance link is `<link>`

Examples:

| ticker | data | link |
|---|---|---|
| AAPL | market data | `https://finance.yahoo.com/quote/AAPL` |
| BRK.B | market data | `https://finance.yahoo.com/quote/BRK.B` |
| INFY.NS | a Hand Price | `https://finance.yahoo.com/quote/INFY.NS` |
| RELIANCE.BO | a Hand Price | `https://finance.yahoo.com/quote/RELIANCE.BO` |
| TDF2055 | a Hand Price | absent |

### Requirement: The drawer leads to the Position's account
The drawer SHALL offer "View ⟨account⟩", which goes to that Stocks Holding's detail page with the drawer closed.

#### Scenario: PD-07 View the account
- **GIVEN** the AAPL drawer of Stocks Holding h5 "Fidelity Brokerage", open on `/assets/stocks`
- **WHEN** it renders
- **THEN** "View Fidelity Brokerage" points to `/holdings/h5`
