# portfolio-records

## Purpose

Stores a User's Portfolio: Holdings with their Positions, Liabilities, dated Valuations, Goals and Projection Assumptions. Validates every write, and keeps each User's records invisible to every other User.

## ADDED Requirements

### Requirement: Each User's records are isolated by Row-Level Security
Every per-User table SHALL have Row-Level Security enabled. A User SHALL be able to read and write only their own rows. Acting on another User's record SHALL behave as if it doesn't exist.

#### Scenario: DM-01 Another User's records are invisible
- **GIVEN** User A and User B, each with a Holding, a Position, a Liability, Valuations and a Goal
- **WHEN** User B reads `<table>` directly with their own session
- **THEN** none of User A's rows are returned

Examples:

| table |
|---|
| holding |
| position |
| holding_valuation |
| liability |
| liability_valuation |
| goal |
| country_assumption |

#### Scenario: DM-02 Another User's records can't be changed
- **GIVEN** User A's Holding, Liability and Goal
- **WHEN** User B tries to edit, archive, update the value of or delete each one
- **THEN** each attempt is refused as not found
- **AND** User A's records are unchanged

#### Scenario: DM-03 A Valuation can't point at another User's Holding
- **GIVEN** User A's Holding
- **WHEN** User B inserts a Valuation for it directly with their own session, setting their own user id
- **THEN** the insert is rejected

### Requirement: A new User gets a Portfolio with every assumption blank
Signing in for the first time SHALL create exactly one Portfolio for the User. Its Projection Assumptions, Monthly savings, savings growth and horizon SHALL all be blank.

#### Scenario: DM-04 First sign-in creates a blank Portfolio
- **GIVEN** a User signing in for the first time
- **WHEN** their Portfolio is read
- **THEN** exactly one Portfolio exists for them
- **AND** every Projection Assumption, Monthly savings amount, the savings growth rate and the horizon are blank

### Requirement: Countries are data with their own currency and defaults
The Countries SHALL be stored as shared, read-only data: US and India, each with its currency and its default inflation, Real estate, Stocks and Cash rates. A Holding or Liability SHALL name one of them.

#### Scenario: DM-05 The two Countries and their defaults
- **GIVEN** the new schema
- **WHEN** the Countries are read
- **THEN** `<country>` has currency `<currency>` and defaults inflation `<infl>`, Real estate `<re>`, Stocks `<st>` and Cash `<cash>` (% per year)

Examples:

| country | currency | infl | re | st | cash |
|---|---|---|---|---|---|
| US | USD | 3 | 4 | 7 | 3.5 |
| IN | INR | 5 | 6 | 11 | 6.5 |

#### Scenario: DM-06 An unknown Country or Asset Class is rejected
- **GIVEN** a signed-in User
- **WHEN** they create a Holding with Country `<country>` and Asset Class `<class>`
- **THEN** the Holding is `<outcome>`

Examples:

| country | class | outcome |
|---|---|---|
| US | cash | created |
| IN | realestate | created |
| UK | cash | rejected |
| US | equity | rejected |
| US | bonds | rejected |

### Requirement: Creating a manually valued Holding records today's Valuation
A Holding of any Asset Class except Stocks SHALL be created with a name, Country, Asset Class and a current value ≥ 0, plus an optional Description and Cost Basis ≥ 0. Creating it SHALL record today's Valuation at that value.

#### Scenario: DM-07 Creating a Cash Holding
- **GIVEN** a signed-in User with no Holdings
- **WHEN** they create a US Cash Holding "Chase Checking" with value 6,200 and Description "Everyday account"
- **THEN** the Holding exists with that name, Description, Country and Asset Class, and no Cost Basis
- **AND** it has one Valuation of 6,200 dated today

#### Scenario: DM-08 Invalid Holding input is rejected with a reason
- **GIVEN** a signed-in User
- **WHEN** they create a Cash Holding with `<field>` set to `<value>`
- **THEN** it is rejected with a message naming the problem
- **AND** no Holding or Valuation is stored

Examples:

| field | value |
|---|---|
| name | (blank) |
| value | (missing) |
| value | -1 |
| cost basis | -5 |

#### Scenario: DM-09 A blank Description is not stored
- **GIVEN** a signed-in User
- **WHEN** they create a Holding whose Description is blank or only spaces
- **THEN** the Holding has no Description

### Requirement: Class-specific fields belong only to their Asset Class
A Real estate Holding SHALL have a Property type (Residential, Land, REIT / fund or Commercial; Residential when omitted) and an optional city. A Metals Holding MAY have a quantity > 0 with a unit of `g` (default) or `oz t`. These fields SHALL be rejected on any other Asset Class.

#### Scenario: DM-10 Real estate takes a Property type and city
- **GIVEN** a signed-in User
- **WHEN** they create an India Real estate Holding "Pune apartment" with value 6,200,000, Cost Basis 4,800,000 and city "Pune", with no Property type
- **THEN** its Property type is Residential and its city is "Pune"

#### Scenario: DM-11 Metals take a quantity and unit
- **GIVEN** a signed-in User
- **WHEN** they create a US Metals Holding "Silver Eagles" with quantity 20, unit `oz t` and value 640
- **THEN** it stores quantity 20 in `oz t` and value 640

#### Scenario: DM-12 Fields of another Asset Class are rejected
- **GIVEN** a signed-in User
- **WHEN** they create a `<class>` Holding with `<field>`
- **THEN** it is rejected

Examples:

| class | field |
|---|---|
| cash | Property type Land |
| crypto | quantity 2 |
| realestate | Property type Castle |
| metals | unit kg |

### Requirement: Update value records today's Valuation, even when unchanged
Updating a manually valued Holding's value SHALL upsert its Valuation dated today. A second save on the same day SHALL replace that day's Valuation. Saving an unchanged value SHALL still record today's Valuation.

#### Scenario: DM-13 An unchanged value still records today
- **GIVEN** a Cash Holding whose only Valuation is 6,200, dated 40 days ago
- **WHEN** its value is updated to 6,200
- **THEN** it has two Valuations, the newer one 6,200 dated today

#### Scenario: DM-14 A same-day save overwrites
- **GIVEN** a Cash Holding whose value was updated to 6,000 earlier today
- **WHEN** its value is updated to 6,500
- **THEN** it has exactly one Valuation dated today, of 6,500

#### Scenario: DM-15 A Stocks Holding has no Update value
- **GIVEN** a Stocks Holding
- **WHEN** an Update value of 10,000 is sent for it
- **THEN** it is rejected, because a Stocks Holding's value comes from its Positions

### Requirement: Editing a Holding records today's Valuation
Editing a Holding SHALL replace its editable fields and upsert today's Valuation at the saved value (for Stocks, at Σ shares × price). A Holding's Country and Asset Class SHALL be fixed after creation.

#### Scenario: DM-16 Renaming records today's value too
- **GIVEN** a Crypto Holding "Coinbase" valued at 8,600 ten days ago
- **WHEN** it is edited to name "Coinbase wallet" with value 8,600
- **THEN** its name is "Coinbase wallet"
- **AND** it has a Valuation of 8,600 dated today

#### Scenario: DM-17 Country and Asset Class can't change
- **GIVEN** a US Cash Holding
- **WHEN** it is edited with Country India or Asset Class Crypto
- **THEN** the edit is rejected and the Holding is unchanged

### Requirement: A Stocks Holding is an account of at least one Position
Creating or editing a Stocks Holding SHALL carry its full list of Positions, which replaces the stored list. Each Position has a ticker, shares > 0 and an optional average cost > 0 (defaulting to the price on entry). Tickers SHALL be unique within the Holding. An India Holding's tickers without a suffix SHALL get `.NS`.

#### Scenario: DM-18 Creating a brokerage account
- **GIVEN** market data for AAPL at $232.10 and MSFT at $428.40
- **WHEN** a User creates a US Stocks Holding "Fidelity Brokerage" with AAPL 30 shares at average cost 165 and MSFT 12 shares with no average cost
- **THEN** it has two Positions, and MSFT's average cost is 428.40
- **AND** it has one Valuation dated today of 30 × 232.10 + 12 × 428.40 = 12,103.80

#### Scenario: DM-19 Stocks Position input rules
- **GIVEN** a signed-in User creating a US Stocks Holding
- **WHEN** its Positions are `<positions>`
- **THEN** the save is `<outcome>`

Examples:

| positions | outcome |
|---|---|
| (none) | rejected: at least one Position |
| AAPL with 0 shares | rejected |
| AAPL twice | rejected: duplicate ticker |
| aapl with 5 shares | created, ticker stored as AAPL |

#### Scenario: DM-20 India tickers get `.NS`
- **GIVEN** a signed-in User
- **WHEN** they create an India Stocks Holding "Zerodha" with Positions `INFY` and `TCS.NS`, each with a Hand Price
- **THEN** the stored tickers are `INFY.NS` and `TCS.NS`

#### Scenario: DM-21 Editing replaces the Position list
- **GIVEN** a Stocks Holding with Positions AAPL, MSFT and JPM
- **WHEN** it is edited with Positions AAPL (40 shares) and NVDA
- **THEN** it has exactly the Positions AAPL with 40 shares and NVDA

### Requirement: A ticker without a market price needs a Hand Price
A Position whose ticker has no cached market price SHALL carry a Hand Price > 0, a Sector from the 12 (Other when omitted) and an optional name (the ticker when omitted). A new Hand Price SHALL be dated today.

#### Scenario: DM-22 An unknown ticker without a price is rejected
- **GIVEN** no market data for `TDF2055`
- **WHEN** a User saves a Stocks Holding with Position `TDF2055`, 100 shares and no Hand Price
- **THEN** it is rejected, asking for its price

#### Scenario: DM-23 A Hand-Priced Position stores its price, date, Sector and name
- **GIVEN** no market data for `INFY.NS`
- **WHEN** a User saves an India Stocks Holding with `INFY`, 90 shares, Hand Price 1,880, Sector Technology and name "Infosys"
- **THEN** the Position stores Hand Price 1,880 with `price as of` today, Sector Technology and name "Infosys"

#### Scenario: DM-25 An invalid Sector is rejected
- **GIVEN** a Position with a Hand Price
- **WHEN** it is saved with Sector "Crypto"
- **THEN** the save is rejected

### Requirement: A Hand Price is re-dated only when it changes or the User confirms prices
Saving a Stocks Holding SHALL set a Position's `price as of` date to today only when its Hand Price changed. An unchanged Hand Price SHALL keep its date, unless the save explicitly confirms prices, which SHALL re-date every Hand Price on the Holding to today.

#### Scenario: DM-24 A changed Hand Price is re-dated
- **GIVEN** a Position in `INFY.NS` with Hand Price 1,880 as of 47 days ago
- **WHEN** the Stocks Holding is saved with Hand Price 1,912 for `INFY.NS`
- **THEN** its Hand Price is 1,912 with `price as of` today

#### Scenario: DM-39 An unchanged Hand Price keeps its date
- **GIVEN** a Stocks Holding "Zerodha" with `INFY.NS` at Hand Price 1,880 as of 47 days ago and `TCS.NS` at 4,150 as of 10 days ago
- **WHEN** it is renamed "Zerodha Kite" and saved with `TCS.NS` at 4,200 and `INFY.NS` unchanged, without confirming prices
- **THEN** `INFY.NS` is still as of 47 days ago
- **AND** `TCS.NS` is 4,200 as of today

#### Scenario: DM-40 Confirming prices re-dates every Hand Price
- **GIVEN** a Stocks Holding with `INFY.NS` at Hand Price 1,880 as of 47 days ago and `TCS.NS` at 4,150 as of 10 days ago
- **WHEN** it is saved with both prices unchanged and prices confirmed
- **THEN** both Hand Prices are as of today, at their unchanged prices

### Requirement: Archiving a Holding keeps its history and unlinks its loans
Archiving SHALL set the Holding's archive date and keep its Positions and Valuations. Any Liability linked to it SHALL be unlinked. An archived Holding SHALL NOT accept edits or Update value.

#### Scenario: DM-26 Archiving a financed Holding
- **GIVEN** a Real estate Holding with three Valuations and a Liability linked to it
- **WHEN** the Holding is archived
- **THEN** it has an archive date of today and still has its three Valuations
- **AND** the Liability is no longer linked to any Holding

#### Scenario: DM-27 An archived Holding is read-only
- **GIVEN** an archived Cash Holding
- **WHEN** an edit or Update value is sent for it
- **THEN** it is rejected and no Valuation is recorded

### Requirement: A Liability is a flat loan whose balance is a Valuation
A Liability SHALL be created with a name, Country, balance ≥ 0, APR ≥ 0 and Monthly payment > 0. Its optional principal is stored as max(principal, balance), defaulting to the balance. Term is optional, the start month defaults to this month, and revolving defaults to off. Each save SHALL upsert today's balance Valuation.

#### Scenario: DM-28 Creating a loan
- **GIVEN** a signed-in User
- **WHEN** they create a US Liability "Student loan" with balance 13,900, principal 32,000, APR 4.5, Monthly payment 330, term 10 years and start month March 2021
- **THEN** it stores those figures, is not revolving and has no linked Holding
- **AND** it has one balance Valuation of 13,900 dated today

#### Scenario: DM-29 Liability input rules
- **GIVEN** a signed-in User
- **WHEN** they create a Liability with balance `<balance>`, principal `<principal>`, APR `<apr>` and Monthly payment `<payment>`
- **THEN** the save is `<outcome>`

Examples:

| balance | principal | apr | payment | outcome |
|---|---|---|---|---|
| 1850 | (blank) | 24.9 | 150 | created, principal 1850 |
| 9100 | 5000 | 5.9 | 501 | created, principal 9100 |
| -1 | (blank) | 5 | 100 | rejected |
| 1000 | (blank) | -1 | 100 | rejected |
| 1000 | (blank) | 5 | 0 | rejected |

#### Scenario: DM-30 The start month defaults to this month
- **GIVEN** today is 2026-10-14
- **WHEN** a Liability is created with no start month
- **THEN** its start month is October 2026

#### Scenario: DM-31 A balance edit records today's Valuation
- **GIVEN** a Liability whose balance Valuation of 9,100 is dated 35 days ago
- **WHEN** its balance is edited to 8,650
- **THEN** it has a balance Valuation of 8,650 dated today
- **AND** editing it again the same day to 8,600 leaves one Valuation dated today, of 8,600

### Requirement: A Liability may be linked to one of the User's active Holdings
A Liability's linked Holding SHALL be one of the same User's non-archived Holdings. A Holding SHALL be linked from at most one non-archived Liability.

#### Scenario: DM-32 Which Holdings can be linked
- **GIVEN** a User with an active Holding H, an archived Holding A, a Holding L already linked from another active Liability, and another User's Holding X
- **WHEN** they save a Liability linked to `<holding>`
- **THEN** the save is `<outcome>`

Examples:

| holding | outcome |
|---|---|
| H | saved with the link |
| A | rejected |
| L | rejected |
| X | rejected |

### Requirement: Archiving a Liability keeps its balance history
Archiving SHALL set the Liability's archive date and keep its Valuations and link. An archived Liability SHALL NOT accept edits.

#### Scenario: DM-33 Archiving a paid-off loan
- **GIVEN** a Liability with two balance Valuations
- **WHEN** it is archived
- **THEN** it has an archive date of today and still has both Valuations
- **AND** a later edit to it is rejected

### Requirement: Goals are created with a positive USD target and really deleted
A Goal SHALL have an optional name and a target in USD > 0. A blank name SHALL be stored as no name. Removing a Goal SHALL delete it.

#### Scenario: DM-34 Goal targets
- **GIVEN** a signed-in User
- **WHEN** they create a Goal named `<name>` with target `<target>`
- **THEN** the save is `<outcome>`

Examples:

| name | target | outcome |
|---|---|---|
| Quarter million | 250000 | created |
| (blank) | 100000 | created with no name |
| Zero | 0 | rejected |
| Negative | -5 | rejected |

#### Scenario: DM-35 Removing a Goal deletes it
- **GIVEN** a User with Goals "$100K net worth" and "Half a million"
- **WHEN** they remove "$100K net worth"
- **THEN** only "Half a million" remains, and the removed Goal can't be read back

### Requirement: Projection Assumptions update partially, and blank means default
One settings update SHALL change only the fields it carries: per Country inflation, Real estate, Stocks and Cash rates and Monthly savings; shared Crypto, Metals and Vehicles & other rates; savings growth; and horizon. Sending a blank SHALL clear that field back to its default.

#### Scenario: DM-36 A partial update leaves the rest untouched
- **GIVEN** a User with US Stocks 8 and horizon 15
- **WHEN** they update only India Monthly savings to 50,000
- **THEN** India Monthly savings is 50,000, US Stocks is still 8 and horizon is still 15

#### Scenario: DM-37 Reset defaults blanks every field
- **GIVEN** a User with several rates, Monthly savings and a horizon filled in
- **WHEN** they send every field blank
- **THEN** every field reads back blank

#### Scenario: DM-38 Assumption ranges
- **GIVEN** a signed-in User
- **WHEN** they set `<field>` to `<value>`
- **THEN** the update is `<outcome>`

Examples:

| field | value | outcome |
|---|---|---|
| US Stocks rate | -50 | saved |
| US Stocks rate | 50.5 | rejected |
| Crypto rate | 0 | saved |
| horizon | 40 | saved |
| horizon | 0 | rejected |
| horizon | 41 | rejected |
| horizon | 12.5 | rejected |
| India Monthly savings | -1 | rejected |
| savings growth | 3 | saved |
