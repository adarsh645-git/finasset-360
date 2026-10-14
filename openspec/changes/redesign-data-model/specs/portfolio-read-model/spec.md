# portfolio-read-model

## Purpose

Loads everything a signed-in User's screens show, in one read under Row-Level Security: Holdings with Positions and current values, Liabilities, Valuations, FX Rates, Projection Assumptions, Monthly savings and Goals. Also serves the interim home page while the screens are rebuilt.

## ADDED Requirements

### Requirement: The Portfolio is read in one load, for the signed-in User only
One read SHALL return the signed-in User's whole Portfolio and nothing of any other User's. A request with no session SHALL be refused.

#### Scenario: RM-01 A new User's Portfolio is empty
- **GIVEN** a User who has just signed in for the first time
- **WHEN** their Portfolio is read
- **THEN** it has no Holdings, Liabilities or Goals
- **AND** it lists the Countries US and India with their defaults
- **AND** every Projection Assumption, Monthly savings, the savings growth rate and the horizon are blank

#### Scenario: RM-02 Only the User's own records come back
- **GIVEN** User A and User B, each with Holdings, Liabilities and Goals
- **WHEN** User B's Portfolio is read
- **THEN** it contains only User B's records

#### Scenario: RM-03 No session, no Portfolio
- **GIVEN** a request with no session
- **WHEN** the Portfolio is read
- **THEN** it is refused as unauthorized

### Requirement: Each Holding comes with its current value and Cost Basis
A Stocks Holding's current value SHALL be Σ shares × price and its Cost Basis Σ shares × average cost, each Position showing its price source and Hand Price date. Any other Holding's current value SHALL be its latest Valuation. Every Valuation SHALL say whether the User or the daily job recorded it.

#### Scenario: RM-04 A Stocks Holding is valued from its Positions
- **GIVEN** a US Stocks Holding with 30 AAPL at average cost 165 (market price 232.10) and 100 `TDF2055` at average cost 40 (Hand Price 45, as of 2026-09-01, with no market data)
- **WHEN** the Portfolio is read
- **THEN** the Holding's current value is 30 × 232.10 + 100 × 45 = 11,463 and its Cost Basis is 30 × 165 + 100 × 40 = 8,950
- **AND** AAPL is priced from market data with its name, Sector and exchange, and no price date
- **AND** `TDF2055` is priced by hand, as of 2026-09-01, with its own Sector and name

#### Scenario: RM-05 A manually valued Holding's value is its latest Valuation
- **GIVEN** a Real estate Holding with Valuations 6,000,000 a year ago and 6,200,000 ten days ago, and Cost Basis 4,800,000
- **WHEN** the Portfolio is read
- **THEN** its current value is 6,200,000 and its Cost Basis is 4,800,000
- **AND** both Valuations are listed with their dates, each marked user-entered

#### Scenario: RM-12 Valuations say who recorded them
- **GIVEN** a Stocks Holding with a Valuation the User saved on 2026-10-01 and daily snapshots since
- **WHEN** the Portfolio is read
- **THEN** the 2026-10-01 Valuation is marked user-entered and the snapshots are marked automatic

### Requirement: Each Liability comes with its current balance
A Liability's current balance SHALL be its latest balance Valuation, never amortized forward. It SHALL come with its loan terms, linked Holding and every balance Valuation.

#### Scenario: RM-06 A loan's balance is as recorded
- **GIVEN** a Liability with balance Valuations 9,600 six months ago and 9,100 forty days ago, APR 5.9 and Monthly payment 501
- **WHEN** the Portfolio is read
- **THEN** its current balance is 9,100
- **AND** it carries APR 5.9, Monthly payment 501, its start month, its revolving flag and its linked Holding

### Requirement: Archived items stay in the Portfolio for history
Archived Holdings and Liabilities SHALL be returned with their archive date, Positions and Valuations, so that history counts them for the dates they were held. Active items SHALL have no archive date.

#### Scenario: RM-07 An archived Holding is still returned
- **GIVEN** a Holding with two Valuations, archived last week
- **WHEN** the Portfolio is read
- **THEN** it is returned with its archive date and both Valuations

### Requirement: Today's FX Rate and the FX history come with the Portfolio
The read SHALL include today's FX Rate as the latest stored rate, with its date. It SHALL also include every stored rate from the latest one on or before the Portfolio's earliest Valuation through today.

#### Scenario: RM-08 A missed fetch shows its date
- **GIVEN** FX Rates stored up to 2026-10-10 at 83.40, and today is 2026-10-14
- **WHEN** the Portfolio is read
- **THEN** today's FX Rate is 83.40 as of 2026-10-10

#### Scenario: RM-09 FX history covers the earliest Valuation
- **GIVEN** a Portfolio whose earliest Valuation is dated 2024-03-03 (a Sunday), and FX Rates for every business day since 2018
- **WHEN** the Portfolio is read
- **THEN** its FX history starts with the rate of 2024-03-01 and runs through the latest stored rate

### Requirement: Projection Assumptions are returned with blanks kept blank
Projection Assumptions, Monthly savings per Country, savings growth and horizon SHALL be returned as stored. A blank SHALL stay blank, never filled with its default, and the defaults SHALL be returned separately.

#### Scenario: RM-10 Blank and filled assumptions
- **GIVEN** a User with US Stocks 8, US Monthly savings 3,000 and everything else blank
- **WHEN** the Portfolio is read
- **THEN** US Stocks is 8 and US Monthly savings is 3,000
- **AND** US inflation, India Stocks, Crypto, savings growth and horizon are blank
- **AND** the US Country's default Stocks rate is 7

### Requirement: Goals come sorted by target
Goals SHALL be returned with their name (or none) and USD target, sorted by target, smallest first.

#### Scenario: RM-11 Goals in target order
- **GIVEN** Goals "Half a million" (500,000), an unnamed Goal (100,000) and "Quarter million" (250,000)
- **WHEN** the Portfolio is read
- **THEN** they come back as the unnamed Goal, "Quarter million", then "Half a million"

### Requirement: The home page is an interim page while the app is rebuilt
Until the Overview ships, a signed-in User visiting the home page SHALL see a "Being rebuilt" page with their name and a sign-out control, and no Portfolio figures. A signed-out visitor SHALL be sent to sign in.

#### Scenario: CI-01 A signed-in User sees the interim page
- **GIVEN** a signed-in User named Adarsh
- **WHEN** the home page is rendered
- **THEN** it says the app is being rebuilt and shows "Adarsh" and Sign out
- **AND** it shows no Net Worth, Holding or Liability figures

#### Scenario: CI-02 A signed-out visitor is sent to sign in
- **GIVEN** no session
- **WHEN** the home page is requested
- **THEN** the visitor is redirected to the sign-in page
